import { useEffect, useState, useMemo } from 'react';
import { Title, Text, Stack, ActionIcon, Tooltip, Button, Flex } from '@mantine/core'
import { IconCopy, IconCheck } from '@tabler/icons-react'
import { MantineReactTable, useMantineReactTable, MRT_ColumnDef } from 'mantine-react-table';

import { fetchDesignSheet } from './designAction';
import ImageCopyCell from './ImageCopyCell';
import { useDesignContext } from './useDesignContext';
import { useGoogleAuth } from '../orders/GoogleAuthContext';


type DesignRow = {
  productName: string;
  sku: string;
  frontDesignLink: string;
  frontDesignImage: string;
  frontMockupLink: string;
  frontMockupImage: string;
  backDesignLink: string;
  backDesignImage: string;
  backMockupLink: string;
  backMockupImage: string;
};

const DesignsPage = () => {
  //const [designs, setDesigns] = useState<any[]>([]);

  const { designs, isLoading, refresh, searchText, setSearchTextWithCache, fetchDesigns } = useDesignContext();
  const { accessToken } = useGoogleAuth();

  useEffect(() => {
    fetchDesigns();
  }, [accessToken]);

  const token = localStorage.getItem('google_access_token');
  const [showGlobalFilter, setShowGlobalFilter] = useState(true);

  const data = useMemo<DesignRow[]>(() => designs.map((item: any) => ({
    productName: item.productName ?? '',
    sku: item.sku ?? '',
    frontDesignLink: item.frontDesignLink ?? '',
    frontDesignImage: item.frontDesingImage ?? '', // note: typo "Desing" in source data
    frontMockupLink: item.frontMockupLink ?? '',
    frontMockupImage: item.frontMockupImage ?? '',
    backDesignLink: item.backDesignLink ?? '',
    backDesignImage: item.backDesignImage ?? '',
    backMockupLink: item.backMockupLink ?? '',
    backMockupImage: item.backMockupImage ?? '',
  })), [designs]);

  const columns = useMemo<MRT_ColumnDef<DesignRow>[]>(() => [
    {
      accessorKey: 'productName',
      header: 'Product Name',
      size: 200,
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      size: 100,
    },
    {
      id: 'frontDesign',
      header: 'Front Design',
      size: 120,
      Cell: ({ row }) => (
        <ImageCopyCell
          imageUrl={row.original.frontDesignImage}
          linkUrl={row.original.frontDesignLink}
        />
      ),
    },
    {
      id: 'frontMockup',
      header: 'Front Mockup',
      size: 120,
      Cell: ({ row }) => (
        <ImageCopyCell
          imageUrl={row.original.frontMockupImage}
          linkUrl={row.original.frontMockupLink}
        />
      ),
    },
    {
      id: 'backDesign',
      header: 'Back Design',
      size: 120,
      Cell: ({ row }) => (
        <ImageCopyCell
          imageUrl={row.original.backDesignImage}
          linkUrl={row.original.backDesignLink}
        />
      ),
    },
    {
      id: 'backMockup',
      header: 'Back Mockup',
      size: 120,
      Cell: ({ row }) => (
        <ImageCopyCell
          imageUrl={row.original.backMockupImage}
          linkUrl={row.original.backMockupLink}
        />
      ),
    },
  ], []);

  const table = useMantineReactTable({
    columns,
    data,
    mantinePaginationProps: { showRowsPerPage: true },
    enableStickyHeader: true,
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
    },
    state: {
      //pagination: { pageSize: 50, pageIndex: 0 },
      globalFilter: searchText,
      showGlobalFilter: showGlobalFilter
    },
    onGlobalFilterChange: setSearchTextWithCache,
    onShowGlobalFilterChange: setShowGlobalFilter,
    paginationDisplayMode: 'pages',
    positionGlobalFilter: 'right',
    enablePagination: true,
    enableRowVirtualization: false,
    mantineTableContainerProps: { 
      style: { overflowX: 'auto', maxWidth: '100%', maxHeight: 'calc(100vh - 250px)' },

    },
    mantineTableHeadCellProps: { style: { textAlign: 'left' } },
    mantineTableBodyCellProps: { style: { textAlign: 'left', verticalAlign: 'top' } },
    mantineTableProps: {
      style: { backgroundColor: '#f0f4f8' },
    },
  });

  return (
    <Stack style={{ overflow: 'hidden' }}>
      <Flex justify="space-between" align="center">
        <Title order={2}>Design Library</Title>
        <Button onClick={refresh} loading={isLoading} size='sm'>Refresh</Button>
      </Flex>
      {!token && <Text c="red">Xin hãy đăng nhập vào Google để sử dụng tính năng này.</Text>}
      <MantineReactTable table={table} />
    </Stack>
  );
};

export default DesignsPage;


