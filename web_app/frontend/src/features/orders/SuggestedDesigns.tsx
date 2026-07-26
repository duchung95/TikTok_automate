import { useEffect, useMemo, useState } from "react";
import { Button, Text, Modal, Radio, Group, Stack, Flex } from "@mantine/core";
import classes from './SuggestedDesigns.module.css';
import ImageCopyCell from "../designs/ImageCopyCell";

interface SuggestedDesignsProps {
  designs: any[];
  onUpdateItem: (index: number, patch: Partial<any>, rowOrderId?: string) => void;
  rowIndex: number;
  rowOrderId?: string;
  skuMatch: boolean;
}

const SuggestedDesigns = ({ designs, onUpdateItem, rowIndex, rowOrderId, skuMatch }: SuggestedDesignsProps) => {
  const [selectedDesign, setSelectedDesign] = useState<Record<string, any>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  const [uniqueDesigns, setUniqueDesigns] = useState<any[]>([]);

  const onHandleSubmit = () => {
    onUpdateItem(rowIndex, { 
      designFront: selectedDesign?.frontDesignLink, 
      mockupFront: selectedDesign?.frontMockupLink,
      designBack: selectedDesign?.backDesignLink,
      mockupBack: selectedDesign?.backMockupLink
    }, rowOrderId);
    setModalOpen(false);
  };

   useEffect(() => {
    const designMap: any[] = [];
    const skuMap: Record<string, boolean> = {};
    designs.forEach((design) => {
      if (!(design.sku in skuMap)) {
        designMap.push(design);
        skuMap[design.sku] = true;
      }
    });
    setUniqueDesigns(designMap);
  }, [designs]);

  const cards = uniqueDesigns.map((item) => (
    <Radio.Card className={classes.root} value={item.sku} key={item.sku}>
      <Group wrap="nowrap" align="flex-start">
        <Radio.Indicator />
        <Flex>
          <ImageCopyCell imageUrl={item.frontDesignLink} linkUrl={item.frontDesignLink} />
          <ImageCopyCell imageUrl={item.frontMockupLink} linkUrl={item.frontMockupLink} />
          <ImageCopyCell imageUrl={item.backDesignLink} linkUrl={item.backDesignLink} />
          <ImageCopyCell imageUrl={item.backMockupLink} linkUrl={item.backMockupLink} />
        </Flex>
      </Group>
    </Radio.Card>
  ));
  const description = skuMatch ? "Khớp với SKU. Hãy chọn Design đầu tiên" : "SKU không khớp. Vui lòng chọn Design trong list.";

  const handleDesignSelect = (value: string) => {
    setValue(value);
    const selected = uniqueDesigns.find((design) => design.sku === value);
    setSelectedDesign(selected);
  };

  if (designs.length === 0 ) {
    return <Text size="sm">Không có gợi ý</Text>;
  }

  return (
    <div>
      <Button onClick={() => setModalOpen(true)}>Xem gợi ý</Button>
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Gợi ý thiết kế" size="lg">
        <div style={{maxHeight: '800px', overflowY: 'auto', display: 'flex', flexDirection: 'column'}}>
          <div style={{height: '700px'}}>
            <Radio.Group
              value={value}
              onChange={(setValue) => handleDesignSelect(setValue)}
              label={description}
              styles={{label: { color: skuMatch ? 'blue' : 'red' }}}
            >
              <Stack pt="md" gap="xs">
                {cards}
              </Stack>
            </Radio.Group>
          </div>
          
        </div>
        <div>
            <Button onClick={onHandleSubmit} disabled={Object.keys(selectedDesign).length === 0}>Chọn thiết kế</Button>
          </div>
      </Modal>
    </div>
  );
};

export default SuggestedDesigns;
