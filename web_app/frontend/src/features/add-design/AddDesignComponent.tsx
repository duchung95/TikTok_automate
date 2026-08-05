import { useState } from "react";
import { Flex, Text, Input, Button } from "@mantine/core";
import { useGoogleAuth } from "../context/google_context/useGoogleAuth";
import { showNotification } from "@mantine/notifications";
import { saveToDesignSheet } from "../orders/googleSheetExport";
import { OrderItem } from "../orders/types";

const AddDesignComponent = () => {
    const { signedIn, signIn, accessToken } = useGoogleAuth();

    const rowOrignialState: Record<string, string> = {
        designNames: "",
        designImageLink: "",
        designImage: "",
        mockUpImageLink: "",
        mockupImage: "",
        backDesignLink: "",
        backDesignImage: "",
        backMockupLink: "",
        backMockupImage: "",
        sku: "",
    };

    const fieldMap = {
        "Design Names": "designNames",
        "Design Image Link": "designImageLink",
        "Design Image": "designImage",
        "Mockup Image Link": "mockUpImageLink",
        "Mockup image": "mockupImage",
        "Back Design Link": "backDesignLink",
        "Back Design Image": "backDesignImage",
        "Back Mockup Link": "backMockupLink",
        "Back Mockup Image": "backMockupImage",
        "SKU ID": "sku",
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

        const item: OrderItem = {
            orderId: '',
            customer: '',
            productName: row.designNames,
            linkLabel: '',
            designFront: row.designImageLink || row.designImage,
            designBack: row.backDesignLink || row.backDesignImage,
            mockupFront: row.mockUpImageLink || row.mockupImage,
            mockupBack: row.backMockupLink || row.backMockupImage,
            orderDate: '',
            variation: '',
            fixedVariation: '',
            variantId: '',
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
            skuId: row.sku,
            isSelected: true,
        };

        setExportingToSheet(true);

        try {
            const result = await saveToDesignSheet([item], accessToken!);

            if (result.saved > 0) {
                alert(`Design "${row.designNames}" - SKU: ${row.sku} successfully saved to Google Sheets!`);
                showNotification({
                    title: 'Success',
                    message: 'Design successfully saved to Google Sheets!',
                    color: 'green',
                });
                setRow(rowOrignialState);
            }

            else {
                alert(`Design "${row.designNames}" - SKU: ${row.sku} already exists in the Google Sheet!`);
                showNotification({
                    title: 'Notice',
                    message: 'Design already exists in the Google Sheet!',
                    color: 'yellow',
                });
            }
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
        
        const newErrors: Record<string, string> = {};
        if (!row.designNames.trim()) {
            newErrors.designNames = 'Design name is required!';
        }

        if (!row.sku.trim()) {
            newErrors.sku = 'SKU is required!';
        }

        if (!row.designImage.trim()) {
            newErrors.designImage ='Design Image is required!';
        }

        if (!row.backDesignImage.trim()) {
            newErrors.backDesignImage ='Back Design Image is required!';
        }

        setErrors(newErrors);

        if(Object.keys(newErrors).length > 0){
            return;
        }

        if (signedIn && accessToken) {
            handleSaveToGoogleSheet();
        }
    };

    if (!signedIn) {
        return (
            <div>
                <h2>Add new design</h2>
                <Text c='red'>Please sign in to Google to use this feature!</Text>
            </div>
        );
    };

    return (
        <div>
            <h2>Add new design</h2>
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
                <Button onClick={handleOnSubmit} type="submit" loading={exportingToSheet} color="green">Subtmit</Button>
                <Button onClick={() => setRow(rowOrignialState)} type="button" color="red">Clear</Button>
            </Flex>
        </div>
    );
};

export default AddDesignComponent;