import { Title, Text, Box, TextInput, PinInput } from '@mantine/core'
import flashpod_data from './flashpod_color_variant.json';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  getPaginationRowModel
} from '@tanstack/react-table'
import { useState, useMemo, useRef, useEffect } from 'react'

import { MantineReactTable, useMantineReactTable, MRT_ColumnDef } from 'mantine-react-table';

type ColorData = {
  variant_id: number;
  product_type: string;
  brand: string;
  style: string;
  size: string;
  color: string;
}

export const ColorVariantTable = () => {

  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  const columns = useMemo<MRT_ColumnDef<ColorData>[]>(() => [
    {
      accessorKey: 'color',
      header: 'Color',
    },
    
    {
      accessorKey: 'product_type',
      header: 'Product Type',
    },
    {
      accessorKey: 'brand',
      header: 'Brand',
    },
    {
      accessorKey: 'style',
      header: 'Style',
    },
    {
      accessorKey: 'size',
      header: 'Size',
    },
    {
      accessorKey: 'variant_id',
      header: 'Variant ID',
    },
    
  ], []);

  const data = useMemo(() => flashpod_data['data'].map((item: any) => ({
    variant_id: item.variant_id,
    product_type: item.product_type,
    brand: item.brand,
    style: item.style,
    size: item.size,
    color: item.color,
  })), [flashpod_data]);

  const table = useMantineReactTable({
    columns,
    data,
    mantinePaginationProps: {
      showRowsPerPage: false,
    },
    enableStickyHeader: true,
    initialState: { 
      pagination: { 
        pageSize: 10, // Default number of rows per page
        pageIndex: 0  // Starts on the first page
      }, 
    },
    paginationDisplayMode: 'pages',
    positionGlobalFilter: 'right'
  });
  return (
    <div style={{height: '90vh', overflow: 'auto'}}>
      <Title order={2}>Color Variant Table</Title>
      <MantineReactTable table={table} />
    </div>
  )
};

export default ColorVariantTable;
