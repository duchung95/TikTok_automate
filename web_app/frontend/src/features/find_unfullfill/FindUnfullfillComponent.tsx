import {useEffect, useState, useRef} from "react";
import { useGoogleAuth } from "../orders/useGoogleAuth";
import { fetchExistingOrderIds } from "../orders/googleSheetExport";
import { Stack, Group, Button, Alert, Text, Tooltip, Modal } from '@mantine/core';
import { IconUpload, IconAlertCircle, IconArrowDown, IconDownload } from '@tabler/icons-react';
import { useOrdersStore } from "../orders/useOrdersStore";
import { OrdersPage } from "../orders/OrdersPage";

const FindUnfullfillComponent = () => {
  const { signedIn, signIn, accessToken } = useGoogleAuth();
  if (!signedIn) {
    return (<Text c="red">Xin hãy đăng nhập vào Google để sử dụng tính năng này.</Text>);
  }
  return (
    <OrdersPage findUnfulfilledOrders={true} />
  );
};

export default FindUnfullfillComponent;
