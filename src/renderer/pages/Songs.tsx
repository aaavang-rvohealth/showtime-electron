import { MenuButton, TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Center,
  chakra,
  Divider,
  HStack,
  Input,
  Menu,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
  useToast,
  VStack
} from '@chakra-ui/react';
import {
  ColumnFiltersState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import { useLiveQuery } from 'dexie-react-hooks';
import React, { useContext, useMemo, useState } from 'react';
import { CiImport } from 'react-icons/ci';
import { GrValidate } from 'react-icons/gr';
import { MdAppRegistration, MdDelete } from 'react-icons/md';
import { Filter } from '../common/Filter';
import { Page } from '../common/Page';
import { database, Song } from '../database';
import { JukeboxState } from '../hooks/useJukebox';
import { JukeboxContext } from '../providers/JukeboxProvider';
import { confirmAction } from '../utils/ConfirmAction';
import { decodeName } from '../utils/DecodeName';
import { getFilename } from '../utils/Filename';

export const Songs = () => {
  const toast = useToast();
  const {setJukeboxState} = useContext(JukeboxContext);
  const songs = useLiveQuery(() => database.songs.toArray());
  const [validation, setValidation] = useState({ validated: false, invalidSongs: [] } as {
    validated: boolean,
    invalidSongs: Song[]
  });


  const [newSong, setNewSong] = useState({} as Partial<Song>);
  const newSongModal = useDisclosure();

  const columnHelper = createColumnHelper<Song>();
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

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
        <HStack gap="15px">
          <Button
            colorScheme={'green'}
            variant={'outline'}
            onClick={() => {
              const newJukeboxState: JukeboxState = {
                closeOnEnd: true,
                showJukebox: true,
                song: info.row.original
              };
              setJukeboxState(newJukeboxState);
            }}
          >Play</Button>
          <Menu>
            <MenuButton as={Button} rightIcon={<TriangleDownIcon />}>
              Actions...
            </MenuButton>
            <MenuList>
              <MenuItem
                icon={<MdAppRegistration />}
                onClick={() => {
                  setNewSong({ ...info.row.original });
                  newSongModal.onOpen();
                }}>Edit...</MenuItem>
              <MenuItem icon={<MdDelete />}
                        onClick={confirmAction(`Delete ${info.row.original.title}?`, () => deleteSong(info.row.original.id))}>Delete</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      )
    })
  ], []);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const table = useReactTable(
    {
      columns,
      data: songs ?? [],
      getCoreRowModel: getCoreRowModel(),
      onSortingChange: setSorting,
      getFilteredRowModel: getFilteredRowModel(), //client side filtering
      getSortedRowModel: getSortedRowModel(),
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

  // monkey patch close to clear new song
  const currentOnClose = newSongModal.onClose;
  newSongModal.onClose = () => {
    currentOnClose();
    setNewSong({});
  };

  const handleOpenFile = async () => {
    window.electron.ipcRenderer.once('selectAudioFile', (filePath: any) => {
      setNewSong({
        ...newSong,
        title: decodeName(getFilename(filePath)),
        path: filePath ?? ''
      });
    });

    window.electron.ipcRenderer.sendMessage('selectAudioFile');
  };

  const validateLibrary = async () => {
    window.electron.ipcRenderer.once('validateLibrary', (response: any) => {
      setValidation({
        validated: true,
        invalidSongs: response.invalidSongs
      });

      if (response.invalidSongs.length > 0) {
        toast({
          title: `${response.invalidSongs.length} song(s) have invalid paths!`,
          status: 'error',
          duration: 2000,
          isClosable: true
        });
      } else {
        toast({
          title: `Everything looks good!`,
          status: 'success',
          duration: 2000,
          isClosable: true
        });
      }
    });

    window.electron.ipcRenderer.sendMessage('validateLibrary', { songs });

    // find duplicate songs
    const duplicateSongs = songs!.filter((song, index, self) => self.some(s => s.path === song.path && s.id !== song.id));
    if (duplicateSongs.length > 0) {
      for (const song of duplicateSongs) {
        const variants = await database.danceVariants.where('songId').equals(song.id).toArray();
        if (variants.length === 0) {
          toast({
            title: `Duplicate song found - ${song.title}`,
            description: 'This song is not associated with any dance variants. Deleting.',
            status: 'warning',
            duration: 2000,
            isClosable: true
          });
          await database.songs.delete(song.id);
        }
      }
    }
  };

  const importDirectory = async () => {
    window.electron.ipcRenderer.once('getAudioFilesInDirectory', (response: any) => {
      console.log('getAudioFilesInDirectory', response);

      const newSongs = (response as string[]).map((path: string) => {
        const title = decodeName(getFilename(path));
        return { title, path } as Song;
      }).filter(s => !(songs!.some(song => song.path === s.path)));

      for (const song of newSongs) {
        database.songs.add(song);
      }

    });

    window.electron.ipcRenderer.sendMessage('getAudioFilesInDirectory');
  };

  const saveNewSong = async () => {
    if (!newSong.path) {
      toast({
        title: 'Missing new song path!',
        status: 'error',
        duration: 2000,
        isClosable: true
      });
      return;
    }
    if (!newSong.title) {
      toast({
        title: 'Missing new song title!',
        status: 'error',
        duration: 2000,
        isClosable: true
      });
      return;
    }

    const existingSongs = await database.songs.where('path').equals(newSong.path).toArray();

    // if the newSong.id is set, we are updating an existing song
    if (!newSong.id && existingSongs.length > 0) {
      const existingSong = existingSongs[0];
      toast({
        title: `Song with path already exists - "${existingSong.title}"`,
        status: 'error',
        duration: 2000,
        isClosable: true
      });
      return;
    }

    database.songs.put(newSong as Song);
    setNewSong({} as Song);
    if (validation.validated && validation.invalidSongs.some(s => s.id === newSong.id)) {
      setValidation({
        ...validation,
        invalidSongs: validation.invalidSongs.filter(s => s.id !== newSong.id)
      });
    }
    newSongModal.onClose();
  };

  const deleteSong = async (id: number) => {
    const variants = await database.danceVariants.where('songId').equals(id).toArray();
    const defaultVariants = variants.filter(v => v.defaultVariant);
    console.log('defaultVariants', defaultVariants);
    if (variants.length > 0 && defaultVariants.length === 0) {
      confirmAction(`Delete ${variants.length} associated variants?`, async () => {
        for (const variant of variants) {
          await database.danceVariants.delete(variant.id);
        }
        toast({
          title: 'Success',
          description: `Deleted ${variants.length} associated variants`,
          status: 'success',
          duration: 2000,
          isClosable: true
        });
      });
    } else if (defaultVariants.length > 0) {
      toast({
        title: 'Error',
        description: `Cannot delete song with default variants - ${defaultVariants.map(v => v.title).join(', ')}`,
        status: 'error',
        duration: 10000,
        isClosable: true
      });
      return;
    }

    await database.songs.delete(id);
  };

  if (!songs) {
    return <Page name={'Songs'}>
      <>Loading...</>
    </Page>;
  }

  return (
    <Page name={'Songs'}>
      <VStack justifyContent={'space-between'} height={'100%'}>
        <TableContainer whiteSpace={'wrap'} width={'100%'}>
          <HStack justifyContent={'space-between'}>
            <Button colorScheme={'green'} onClick={newSongModal.onOpen}>+ New Song</Button>
            <Menu>
              <MenuButton as={Button} rightIcon={<TriangleDownIcon />}>
                Library Actions...
              </MenuButton>
              <MenuList>
                <MenuItem icon={<CiImport />} onClick={importDirectory}>Import Directory...</MenuItem>
                <Tooltip label="Make sure every song exists at the given location." openDelay={1000}>
                  <MenuItem icon={<GrValidate />} onClick={validateLibrary}>Validate Library</MenuItem>
                </Tooltip>
              </MenuList>
            </Menu>
          </HStack>
          <Table variant="simple">
            <Thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <Tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    // see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
                    const meta: any = header.column.columnDef.meta;
                    return (
                      <Th
                        key={header.id}
                        isNumeric={meta?.isNumeric}
                      >
                        <VStack alignItems={'flex-start'}>
                          <Box
                            userSelect={'none'}
                            onClick={header.column.getToggleSortingHandler()}>
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
                          {header.column.getCanFilter() ? (
                            <div>
                              <Filter column={header.column} />
                            </div>
                          ) : null}
                        </VStack>
                      </Th>
                    );
                  })}
                </Tr>
              ))}
            </Thead>
            <Tbody overflowY={'scroll'} height={'50'}>
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
              onClick={() => {
                table.nextPage();
              }}
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
      </VStack>
      <Modal isOpen={newSongModal.isOpen} onClose={newSongModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>New Song</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack gap={'5px'}>
              <>
                <Button onClick={handleOpenFile}>Select File</Button>
              </>
              {newSong.path && (
                <>
                  <Text key={'title-label'}>Title</Text>
                  <Input key={'title-input'} value={newSong.title ?? ''}
                         onChange={(e) => {
                           const newState = { ...newSong };
                           newState.title = e.target.value;
                           setNewSong(newState);
                         }} />
                </>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={saveNewSong}>
              Save
            </Button>
            <Button variant="ghost" onClick={newSongModal.onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Page>
  );
};
