import { ChevronDownIcon, MenuButton, TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';
import {
  Box,
  Button, Center, chakra, Divider,
  HStack, Input,
  Menu, MenuItem,
  MenuList, Select,
  Table,
  TableContainer,
  Tbody,
  Td, Text,
  Th,
  Thead,
  Tr,
  useToast, VStack
} from '@chakra-ui/react';
import {
  ColumnFiltersState,
  createColumnHelper, flexRender,
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import { useLiveQuery } from 'dexie-react-hooks';
import React, { useMemo, useState } from 'react';
import { MdAppRegistration, MdDelete } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { Filter } from '../common/Filter';
import { Page } from '../common/Page';
import { Dance, database, Playlist } from '../database';
import { useSavePlaylistModal } from '../hooks/SavePlaylistModal';
import { confirmAction } from '../utils/ConfirmAction';

export const Playlists = () => {
  const navigate = useNavigate()
  const toast = useToast();
  const playlists = useLiveQuery(() => database.playlists.toArray());
  const [savePlaylistModal, PlaylistModal] = useSavePlaylistModal();
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | undefined>();

  const columnHelper = createColumnHelper<Playlist>();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo(() => [
    columnHelper.accessor('title', {
      cell: (info) => info.getValue(),
      header: 'Title',
      filterFn: 'includesString'
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <HStack gap='5px'>
          <Button onClick={() => loadPlaylist(info.row.original)}>Load</Button>
          <Button onClick={() => {
            setPlaylistToEdit(info.row.original);
            savePlaylistModal.onOpen();
          }}>Edit</Button>
          <Button onClick={confirmAction(`Delete playlist,  ${info.row.original.title}?`, () => deletePlaylist(info.row.original.id))}>Delete</Button>
        </HStack>
      )
    })
  ], [playlists]);

  const table = useReactTable(
    {
      columns,
      data: playlists ?? [],
      getCoreRowModel: getCoreRowModel(),
      onSortingChange: setSorting,
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(), //client side filtering
      getPaginationRowModel: getPaginationRowModel(),
      columnResizeMode: 'onChange',
      columnResizeDirection: 'ltr',
      onColumnFiltersChange: setColumnFilters,
      state: {
        sorting,
        columnFilters
      }
    }
  );

  const updatePlaylistTitle = async (playlist: Playlist) => {
    await database.playlists.update(playlist.id, {
      title: playlist.title
    });
  }

  const deletePlaylist = async (playlistId: number) => {
    await database.playlists.delete(playlistId);
  }

  const loadPlaylist = async (playlist: Playlist) => {
    localStorage.setItem('tracks', playlist.tracksString);
    navigate('/');
    toast({
      title: 'Success',
      description: `Playlist loaded - ${playlist.title}`,
      status: 'success',
      duration: 2000,
      isClosable: true
    })
  }

  return (
    <Page name={'Playlists'}>
      <TableContainer>
        <HStack>
          <Button colorScheme={'green'} onClick={() => {
            toast({
              title: 'Taking you to Practice Time',
              description: 'New playlists are created in Practice Time!',
              status: 'info',
              duration: 5000,
              isClosable: true
            })
            navigate('/');
          }}>+ New Playlist</Button>
        </HStack>
        <Table variant='simple'>
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  // see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
                  const meta: any = header.column.columnDef.meta;
                  return (
                    <Th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      isNumeric={meta?.isNumeric}
                    >
                      <VStack alignItems={'flex-start'}>
                        <Box>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}

                          <chakra.span pl="4">
                            {header.column.getIsSorted() ? (
                              header.column.getIsSorted() === 'desc' ? (
                                <TriangleDownIcon aria-label="sorted descending" />
                              ) : (
                                <TriangleUpIcon aria-label="sorted ascending" />
                              )
                            ) : null}
                          </chakra.span>
                        </Box>
                        {header.column.getCanFilter() && (
                          <div>
                            <Filter column={header.column} />
                          </div>
                        )}
                      </VStack>
                    </Th>
                  );
                })}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table.getRowModel().rows.map((row) => (
              <Tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  // see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
                  const meta: any = cell.column.columnDef.meta;
                  return (
                    <Td key={cell.id} isNumeric={meta?.isNumeric}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Td>
                  );
                })}
              </Tr>
            ))}
          </Tbody>
        </Table>
        <HStack gap={'15px'} justifyContent={'center'}>
          <Button
            onClick={() => table.setPageIndex(0)}
            isDisabled={!table.getCanPreviousPage()}
          >
            {'<<'}
          </Button>
          <Button
            onClick={() => table.previousPage()}
            isDisabled={!table.getCanPreviousPage()}
          >
            {'<'}
          </Button>
          <Button
            onClick={() => table.nextPage()}
            isDisabled={!table.getCanNextPage()}
          >
            {'>'}
          </Button>
          <Button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            isDisabled={!table.getCanNextPage()}
          >
            {'>>'}
          </Button>
          <Center gap={'5px'}>
            <Text>Page</Text>
            <strong>
              {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </strong>
          </Center>
          <Center height="20px">
            <Divider orientation="vertical" />
          </Center>
          <Center gap={'5px'}>
            Go to page:
            <Input
              width={'100px'}
              type="number"
              defaultValue={table.getState().pagination.pageIndex + 1}
              onChange={e => {
                const page = e.target.value ? Number(e.target.value) - 1 : 0;
                if (page >= 0 && page < table.getPageCount())
                  table.setPageIndex(page);
              }}
            />
          </Center>
          <Select
            width={'150px'}
            value={table.getState().pagination.pageSize}
            onChange={e => {
              table.setPageSize(Number(e.target.value));
            }}
          >
            {[10, 20, 30, 40, 50].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </Select>
        </HStack>
      </TableContainer>
      <PlaylistModal onSubmit={updatePlaylistTitle} initialValue={playlistToEdit} />
    </Page>
  );
}
