import { useRef, useState } from 'react'
import { Stack, Group, Button, Alert, Text, Tooltip, Modal } from '@mantine/core'
import { IconUpload, IconAlertCircle, IconArrowDown, IconDownload } from '@tabler/icons-react'
import { useOrdersStore } from './useOrdersStore'
import { OrdersTable, getRowStatus } from './OrdersTable'
import { exportToXlsx, getPartialExportViolations } from './exportXlsx'
import { showNotification } from '@mantine/notifications'
import { useGoogleAuth } from './GoogleAuthContext'
import { appendToSheet } from './googleSheetExport'

/**
 * Orders page component
 * @returns JSX.Element
 */
export const OrdersPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const {
    items, checked, isLoading, error,
    importCsv, updateItem, toggleChecked, selectAll, clearAll,
  } = useOrdersStore()

  const needsAttentionCount = items.filter(
    item => getRowStatus(item) !== 'ready'
  ).length

  const selectedItems: Record<string, number> = {};
  items.forEach((item, i) => {
    if (item.isSelected) {
      selectedItems[item.orderId] = 1;
    }
  });
  //const checkedCount = Object.values(checked).filter(Boolean).length
  const checkedCount = Object.keys(selectedItems).length;
  const checkedIndices = new Set(
    Object.entries(checked).filter(([, v]) => v).map(([k]) => Number(k))
  )

  // Google Sheets export state
  const { signedIn, signIn, accessToken } = useGoogleAuth()
  const [exportingToSheet, setExportingToSheet] = useState(false)
  const [duplicateModal, setDuplicateModal] = useState<null | { duplicateOrderIds: string[], onAction: (action: 'skip' | 'overwrite' | 'cancel') => void }>(null);
  const invalidSelectedItems = () => {
    const invalidItems = items.filter((item, i) => item.isSelected &&getRowStatus(item) !== 'ready');
    if (invalidItems.length > 0) {
      setExportError(
        'Không thể xuất đơn hàng thiếu thông tin:\n' + invalidItems.map(item => `${item.orderId}`).join('\n')
      );
      return true;
    }
    return false;
  }

  // Handles exporting selected orders to Google Sheet (separate from Excel export)
  const handleSaveToGoogleSheet = async () => {
    setExportError(null);
    setIsExporting(false);
    if (!signedIn) {
      signIn();
      return;
    }
    if (checkedCount === 0) {
      showNotification({
        title: 'Chưa chọn đơn hàng',
        message: 'Vui lòng chọn ít nhất một đơn hàng để xuất lên Google Sheet.',
        color: 'yellow',
      });
      return;
    }
    
    const invalidItems = invalidSelectedItems();
    if (invalidItems) return;
    setExportingToSheet(true)
    try {
      await appendToSheet({
        items,
        checkedIndices,
        onDuplicatesFound: (result) => {
          return new Promise((resolveModal) => {
            setDuplicateModal({
              duplicateOrderIds: result.duplicateOrderIds,
              onAction: (action) => {
                setDuplicateModal(null);
                resolveModal(action);
                setExportError(null);
                setIsExporting(false);
              }
            })
          })
        }
      })
      showNotification({
        title: 'Thành công',
        message: 'Đã lưu đơn hàng lên Google Sheet thành công!',
        color: 'green',
      })
    } catch (err: any) {
      showNotification({
        title: 'Lỗi',
        message: err?.message || 'Có lỗi xảy ra khi xuất lên Google Sheet.',
        color: 'red',
      })
    } finally {
      setExportingToSheet(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) importCsv(file)
    e.target.value = ''
  }

  const handleExport = async () => {
    setExportError(null);
    const invalidItems = invalidSelectedItems();
    if (invalidItems) return;
    setIsExporting(true)
    try {
      await exportToXlsx(items, checkedIndices)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Stack gap="md">
      {/* Attention banner */}
      {needsAttentionCount > 0 && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="yellow"
          title={`${needsAttentionCount} đơn hàng cần chú ý`}
          withCloseButton={false}
        >
          <Group justify="space-between">
            <Text size="sm">Một số đơn hàng chưa đủ thông tin để xuất file.</Text>
            <Button
              size="xs"
              variant="light"
              color="yellow"
              rightSection={<IconArrowDown size={14} />}
              onClick={() =>
                document.querySelector('[data-needs-attention]')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Đến đơn đầu tiên
            </Button>
          </Group>
        </Alert>
      )}

      {exportError && (
        <Alert color="red" title="Lỗi xuất file" withCloseButton onClose={() => setExportError(null)}>
          <Text size="sm" style={{ whiteSpace: 'pre-line' }}>{exportError}</Text>
        </Alert>
      )}

      {/* Toolbar */}
      <Group justify="space-between">
        <Group>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Button
            leftSection={<IconUpload size={16} />}
            loading={isLoading}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload CSV
          </Button>
          {items.length > 0 && (
            <>
              <Button variant="light" onClick={selectAll}>Select All</Button>
              <Button variant="subtle" color="gray" onClick={clearAll}>Clear</Button>
            </>
          )}
        </Group>

        <Group>
          {checkedCount > 0 && (
            <Text size="sm" c="dimmed">{checkedCount} selected</Text>
          )}
          {/* Regular Excel export button */}
          <Button
            leftSection={<IconDownload size={16} />}
            variant="outline"
            disabled={checkedCount === 0}
            loading={isExporting}
            onClick={handleExport}
          >
            Export XLSX {checkedCount > 0 ? `(${checkedCount})` : ''}
          </Button>
          {/* Google Sheets export button */}
          <Button
            data-testid="export-google-sheet"
            loading={exportingToSheet}
            disabled={checkedCount === 0}
            onClick={handleSaveToGoogleSheet}
            color="blue"
            style={{ marginLeft: 8 }}
          >
            Lưu vào Google Sheet
          </Button>
          <Tooltip label="Tính năng đang phát triển" position="top">
            <Button disabled>
              Submit orders →
            </Button>
          </Tooltip>
        </Group>
      {/* Duplicate orders modal for Google Sheets export */}
      <Modal
        opened={!!duplicateModal}
        onClose={() => {setDuplicateModal(null); setExportingToSheet(false)}}
        title="Đơn hàng trùng lặp"
        centered
      >
        <div>
          <div>
            {`Có ${duplicateModal?.duplicateOrderIds.length ?? 0} đơn hàng đã tồn tại trên Google Sheet.`}
            {duplicateModal?.duplicateOrderIds.length && duplicateModal?.duplicateOrderIds.length > 0 && duplicateModal?.duplicateOrderIds.map((id) => (
              <Text size="sm" c="dimmed">{`Đơn hàng: ${id}`}</Text>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => duplicateModal?.onAction('skip')} color="yellow">Bỏ qua</Button>
            <Button onClick={() => duplicateModal?.onAction('overwrite')} color="red">Ghi đè</Button>
            <Button onClick={() => duplicateModal?.onAction('cancel')} variant="default">Huỷ</Button>
          </div>
        </div>
      </Modal>
      </Group>

      {error && (
        <Alert color="red" title="Lỗi đọc file CSV">{error}</Alert>
      )}

      {items.length === 0 && !error && (
        <Text c="dimmed" ta="center" mt="xl">
          Upload a TikTok Shop CSV to get started.
        </Text>
      )}

      <OrdersTable
        items={items}
        checked={checked}
        onToggleChecked={toggleChecked}
        onUpdateItem={updateItem}
      />
    </Stack>
  )
};
