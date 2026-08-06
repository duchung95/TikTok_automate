import { useState } from "react";
import { Flex, Text, Input, Button } from "@mantine/core";
import { useGoogleAuth } from "../context/google_context/useGoogleAuth";
import { showNotification } from "@mantine/notifications";
import { appendToSheet } from "../orders/googleSheetExport";
import { OrderItem } from "../orders/types";

const AddOrderComponent = () => {
    const { signedIn, signIn, accessToken } = useGoogleAuth();

    const rowOrignialState: Record<string, string> = {
        orderId: "",
        customerName: "",
        productName: "",
        linkLabel: "",
        designFront: "",
        designBack: "",
        mockupFront: "",
        mockupBack: "",
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

    const [row, setRow] = useState<Record<string, string>>(rowOrignialState);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [exportingToSheet, setExportingToSheet] = useState(false);

    const handleInputChange = (field: string, value: string) => {
        const fieldName = fieldMap[field as keyof typeof fieldMap];
        if (fieldName) {
            setRow((prevRow) => ({ ...prevRow, [fieldName]: value }));
            if (errors[fieldName]) {
                setErrors(prev => ({ ...prev, [fieldName]: '' }));
            };
        };
    };

    const handleSaveToGoogleSheet = async () => {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        const yy = today.getFullYear();

        const formattedDate = `${dd}/${mm}/${yy}`;

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
                        alert(`!!! This order already exists in the Google Sheet !!!`)
                    });
                }
            });

            setRow(rowOrignialState);

            showNotification({
                title: 'Success',
                message: 'Order successfully saved to Google Sheets!',
                color: 'green',
            });
        }

        catch (err: any) {
            showNotification({
                title: 'Error',
                message: err.message || 'An error occured while saving to Google Sheets!',
                color: 'red',
            });
        }

        finally {
            setExportingToSheet(false);
        }
    };

    const handleOnSubmit = () => {
        if (!row.orderId.trim()) {
            setErrors({ orderId: '!!! Order ID is required !!!' });
            return;
        };

        setErrors({});

        if (signedIn && accessToken) {
            handleSaveToGoogleSheet();
        };
    };

    if (!signedIn) {
        return (
            <div>
                <h2>Manually enter order</h2>
                <Text c='red'>!!! Please sign in to Google to use this feature !!!</Text>
            </div>
        );
    };

    return (
        <div>
            <h2>Manually enter order</h2>
            <Flex gap="md" wrap="wrap" maw={800}>
                {Object.keys(fieldMap).map((key: string) => {
                    const fieldName = fieldMap[key as keyof typeof fieldMap];
                    return (
                        <Input.Wrapper
                            key={key}
                            label={key}
                            mb="sm"
                            style={{ flex: '1 1 300px' }}
                            error={errors[fieldName]}>
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
            <Flex gap="sm">
                <Button onClick={handleOnSubmit} type = "submit" loading={exportingToSheet} color = "green">Subtmit</Button>
                <Button onClick={() => setRow(rowOrignialState)} type="button" color = "red">Clear</Button>
            </Flex>
        </div>
    );
};

export default AddOrderComponent;