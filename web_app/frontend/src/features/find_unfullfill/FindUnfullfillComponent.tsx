import {useEffect, useState, useRef} from "react";
import { useGoogleAuth } from "../orders/GoogleAuthContext";
import { fetchExistingOrderIds } from "../orders/googleSheetExport";
import { Stack, Group, Button, Alert, Text, Tooltip, Modal } from '@mantine/core';
import { IconUpload, IconAlertCircle, IconArrowDown, IconDownload } from '@tabler/icons-react';
import { useOrdersStore } from "../orders/useOrdersStore";
import { OrdersPage } from "../orders/OrdersPage";

const FindUnfullfillComponent = () => {
  const [unfulfilledOrders, setUnfulfilledOrders] = useState<string[]>([]);
  const { signedIn, signIn, accessToken } = useGoogleAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // const needsAttentionCount = items.filter(
  //     item => getRowStatus(item) !== 'ready'
  //   ).length;
  // useEffect(() => {
  //   if (signedIn && accessToken) {
  //     const getUnfulfilledOrders = async () => {
  //       try {
  //         const { ids } = await fetchExistingOrderIds(accessToken);
  //         setUnfulfilledOrders(Array.from(ids));
  //       } catch (error) {
  //         console.error("Error fetching unfulfilled orders:", error);
  //       }
  //     };

  //     getUnfulfilledOrders();
  //   }
  // }, []);

  // useEffect(() => {
  //   if (signedIn && accessToken) {
  //     const getUnfulfilledOrders = async () => {
  //       try {
  //         const { ids } = await fetchExistingOrderIds(accessToken);
  //         setUnfulfilledOrders(Array.from(ids));
  //       } catch (error) {
  //         console.error("Error fetching unfulfilled orders:", error);
  //       }
  //     };

  //     getUnfulfilledOrders();
  //   }
  // }, [signedIn, accessToken]);

  if (!signedIn) {
    return (<Text c="red">Xin hãy đăng nhập vào Google để sử dụng tính năng này.</Text>);
  }
  return (
    <OrdersPage findUnfulfilledOrders={true} />
  );
};

export default FindUnfullfillComponent;
