import { useRef } from 'react'
import { Stack, Group, Button, Alert, Text } from '@mantine/core'
import { IconUpload, IconAlertCircle, IconArrowDown } from '@tabler/icons-react'
import { useOrdersStore } from './useOrdersStore'
import { OrdersTable } from './OrdersTable'

export function OrdersPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    items, checked, isLoading, error,
    importCsv, updateItem, toggleChecked, selectAll, clearAll, checkedItems,
  } = useOrdersStore()

  const needsAttentionCount = items.filter(
    item => !item.variantId || !item.designFront
  ).length

  const checkedCount = Object.values(checked).filter(Boolean).length

  // suppress unused warning — will be wired up in Step 3
  void checkedItems

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) importCsv(file)
    e.target.value = ''
  }

  return (
    <Stack gap="md">
      {/* Attention banner */}
      {needsAttentionCount > 0 && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="yellow"
          title={`${needsAttentionCount} order${needsAttentionCount > 1 ? 's' : ''} need attention`}
          withCloseButton={false}
        >
          <Group justify="space-between">
            <Text size="sm">Some orders are missing a Variant ID or Design Front URL.</Text>
            <Button
              size="xs"
              variant="light"
              color="yellow"
              rightSection={<IconArrowDown size={14} />}
              onClick={() =>
                document.querySelector('[data-needs-attention]')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Jump to first
            </Button>
          </Group>
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
          <Button variant="outline" disabled={checkedCount === 0}>
            Export XLSX
          </Button>
          <Button disabled={checkedCount === 0}>
            Submit {checkedCount > 0 ? checkedCount : ''} orders →
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" title="Error loading CSV">{error}</Alert>
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
}
