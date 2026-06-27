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
  const columns = useMemo<ColumnDef<ColorData>[]>(() => [
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

  // const data = flashpod_data['data'].map((item: any) => ({
  //   variant_id: item.variant_id,
  //   product_type: item.product_type,
  //   brand: item.brand,
  //   style: item.style,
  //   size: item.size,
  //   color: item.color,
  // }));
  // const table = useReactTable({
  //   data: [],
  //   columns,
  //   onSortingChange: setSorting,
  //   getCoreRowModel: getCoreRowModel(),
  //   getSortedRowModel: getSortedRowModel(),
  // });

  const handleChange = (event: any) => {
    console.log('Search input changed:', event.currentTarget.value);
    setSearch(event.currentTarget.value);
  }
  return (
    <>
      <Title order={2}>Color Variant Table</Title>
      <input
        value={search}
        onChange={handleChange}
      />
      {/* <Box style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {table.getFlatHeaders().map(header => (
                <th key={header.id} style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'left' }}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Box> */}
    </>
  )
};

export default ColorVariantTable;
