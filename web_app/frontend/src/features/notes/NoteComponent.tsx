import { useState } from "react";
import { Flex, Text, Input, Button } from "@mantine/core";
import { useGoogleAuth } from "../context/google_context/useGoogleAuth";
import { showNotification } from '@mantine/notifications'
import { appendToSheet } from "../orders/googleSheetExport";
import { OrderItem } from "../orders/types";

const NoteComponent = () => {
  const { signedIn, signIn, accessToken } = useGoogleAuth();

  const rowOriginalState: Record<string, string> = {
    orderId: "",
    customerName: "",
    productName: "",
    linkLabel: "",
    designFront: "",
    designBack: "",
    mockupFront: "",
    mockupBack: "",
    variantion: "",
    variantId: "",
  };

  const fieldMap = {
    "Order ID": "orderId",
    "Customer Name": "customerName",
    "Product Name": "productName",
    "Link Label": "linkLabel",
    "Design Front": "designFront",
    "Design Back": "designBack",
    "Mockup Front": "mockupFront",
    "Mockup Back": "mockupBack",
    "Variation": "variantId",
  };

  const [row, setRow] = useState<Record<string, string>>(rowOriginalState);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [exportingToSheet, setExportingToSheet] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    const fieldName = fieldMap[field as keyof typeof fieldMap];
    if (fieldName) {
      setRow((prevRow) => ({ ...prevRow, [fieldName]: value }));
      // Clear error when user starts typing
      if (errors[fieldName]) setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleSaveToGoogleSheet = async () => {
    const today = new Date();

    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
    const yyyy = today.getFullYear();

    const formattedDate = `${dd}/${mm}/${yyyy}`;
    const item: OrderItem = {
      orderId: row.orderId,
      customer: row.customerName,
      productName: row.productName,
      linkLabel: row.linkLabel,
      designFront: row.designFront,
      designBack: row.designBack,
      mockupFront: row.mockupFront,
      mockupBack: row.mockupBack,
      orderDate: formattedDate,
      variation: '',
      fixedVariation: '',
      variantId: row.variantId,
      quantity: 1,
      phone: '',
      state: '',
      address1: '',
      address2: '',
      city: '',
      zip: '',
      statusNote: '',
      isPartialLock: false,
      mainImageUrl: [],
      style: '',
      skuId: '',
      isSelected: true,
    };
    setExportingToSheet(true);
    const indices = new Set([1]);
    
    try {
      await appendToSheet({
        items: [item],
        checkedIndices: indices,
        onDuplicatesFound: (result) => {
          return new Promise((resolveModal) => {
            setExportingToSheet(false);
            alert('Đơn hàng đã tồn tại trong Google Sheet')
          });
        }
      });
      setRow(rowOriginalState);
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

  const handleOnSubmit = () => {
    if (!row.orderId.trim()) {
      setErrors({ orderId: 'Order ID is required' });
      return;
    }
    setErrors({});
    if (signedIn && accessToken) {
      handleSaveToGoogleSheet();
    }
  };

  if (!signedIn) {
    return (
      <div>
        <h2>Nhập thông tin đơn hàng bằng tay</h2>
        <Text c="red">Xin hãy đăng nhập vào Google để sử dụng tính năng này.</Text>
      </div>
    );
  }

  return (
    <div>
      <h2>Nhập thông tin đơn hàng bằng tay</h2>
      {/* flex: '1 1 300px' → 2 columns on wide screens, 1 column when width < ~620px */}
      <Flex gap="md" wrap="wrap" maw={800}>
        {Object.keys(fieldMap).map((key: string) => {
          const fieldName = fieldMap[key as keyof typeof fieldMap];
          return (
            <Input.Wrapper key={key} label={key} mb="sm" style={{ flex: '1 1 300px' }} error={errors[fieldName]}>
              <Input
                value={row[fieldName as keyof typeof row]}
                onChange={(e) => handleInputChange(key, e.target.value)}
                name={key}
                error={!!errors[fieldName]}
              />
            </Input.Wrapper>
          );
        })}
      </Flex>
      <Flex>
        <Button onClick={handleOnSubmit} type="submit" loading={exportingToSheet}>Submit</Button>
        <Button onClick={() => setRow(rowOriginalState)} type="button">Clear</Button>
      </Flex>
    </div>
  );
};

export default NoteComponent;
