import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, MenuButton } from '@chakra-ui/icons';
import {
  Button, Center, Divider,
  Flex,
  HStack,
  IconButton, Input,
  Menu,
  MenuGroup,
  MenuItem,
  MenuList, Select,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr, useToast
} from '@chakra-ui/react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable
} from '@tanstack/react-table';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MdCleaningServices, MdFileOpen, MdSave } from 'react-icons/md';
import { Page } from '../common/Page';
import { database, Playlist } from '../database';
import { useSavePlaylistModal } from '../hooks/SavePlaylistModal';
import { HydratedDanceVariant, useSelectDanceModal } from '../hooks/SelectDanceModal';
import { useSelectPlaylistModal } from '../hooks/SelectPlaylistModal';
import { JukeboxState } from '../hooks/useJukebox';
import { JukeboxContext } from '../providers/JukeboxProvider';

export const PracticeTime = () => {
  const toast = useToast();
  const { setJukeboxState } = useContext(JukeboxContext);
  const [loaded, setLoaded] = useState(false);
  const [tracks, setTracks] = useState<HydratedDanceVariant[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [selectDanceModalDisclosure, SelectDanceModal] = useSelectDanceModal();
  const [savePlaylistModalDisclosure, SavePlaylistModal] = useSavePlaylistModal();
  const [selectPlaylistModalDisclosure, SelectPlaylistModal] = useSelectPlaylistModal();
  const [showMode, setShowMode] = useState(false);

  const tracksRef = useRef(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
    if (loaded) {
      localStorage.setItem('tracks', JSON.stringify(tracks));
    }
  }, [tracks]);

  useEffect(() => {
    const storedTracks = localStorage.getItem('tracks');
    if (storedTracks) {
      setTracks(JSON.parse(storedTracks));
    }
    setLoaded(true);
  }, []);


  const currentTrackIndexRef = useRef(currentTrackIndex);
  useEffect(() => {
    currentTrackIndexRef.current = currentTrackIndex;
  }, [currentTrackIndex]);

  const columnHelper = createColumnHelper<HydratedDanceVariant>();

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'reorder',
      header: 'Reorder',
      cell: (info) => (
        <HStack>
          <Text>{info.row.index + 1}</Text>
          {!showMode && <>
            <IconButton isDisabled={info.row.index === 0} aria-label={'move-up'} colorScheme={'gray'} variant={'ghost'}
                        icon={<ArrowUpIcon />} size={'sm'} onClick={() => moveSongUp(info.row.index)} />
            <IconButton isDisabled={info.row.index >= table.getRowModel().rows.length - 1} aria-label={'move-down'}
                        colorScheme={'gray'} variant={'ghost'} icon={<ArrowDownIcon />} size={'sm'}
                        onClick={() => moveSongDown(info.row.index)} />
          </>}
        </HStack>
      )
    }),
    columnHelper.accessor('dance.title', {
      cell: (info) => info.getValue(),
      header: 'Dance'
    }),
    columnHelper.accessor('danceVariant.title', {
      cell: (info) => info.getValue(),
      header: 'Variant'
    }),
    columnHelper.accessor('song.title', {
      cell: (info) => info.getValue(),
      header: 'Song'
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <HStack gap="5px">
          <Button
            colorScheme={'green'}
            variant={'outline'}
            onClick={() => {
              const newJukeboxState: JukeboxState = {
                closeOnEnd: true,
                onEnd: onPlaylistEnd,
                showJukebox: true,
                dance: info.row.original.dance,
                variant: info.row.original.danceVariant,
                song: info.row.original.song,
                currentTrackIndex: info.row.index,
                playlist: tracksRef.current
              };
              setJukeboxState(newJukeboxState);
              setCurrentTrackIndex(info.row.index);
            }}
          >Play</Button>
          {!showMode && <Button colorScheme={'red'} variant={'outline'}
                                onClick={() => deleteRow(info.row.index)}>Delete</Button>}
        </HStack>
      )
    })
  ], [showMode]);

  const table = useReactTable(
    {
      columns,
      data: tracks,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      columnResizeMode: 'onChange',
      columnResizeDirection: 'ltr'
    }
  );

  const moveSongUp = (index: number) => {
    if (index <= 0) {
      return;
    }
    const newTracks = [...tracksRef.current];
    const track = newTracks.splice(index, 1)[0];
    newTracks.splice(index - 1, 0, track);
    setTracks(newTracks);
  };

  const moveSongDown = (index: number) => {
    if (index >= tracksRef.current.length - 1) {
      return;
    }
    const newTracks = [...tracksRef.current];
    const track = newTracks.splice(index, 1)[0];
    newTracks.splice(index + 1, 0, track);
    setTracks(newTracks);
  };

  const onPlaylistEnd = () => {
    toast({
      title: 'All done!',
      status: 'success',
      duration: 2000,
      isClosable: true
    });
  }

  const addTrack = (track: HydratedDanceVariant) => {
    setTracks([...tracks, track]);
  }

  const deleteRow = (index: number) => {
    setTracks([...tracksRef.current.filter((_, i) => i !== index)]);
  };

  const savePlaylist = async (playlist: Playlist) => {
    playlist.tracksString = JSON.stringify(tracks);
    await database.playlists.add(playlist);
  };

  const loadPlaylist = async (playlist: Playlist) => {
    const tracks = JSON.parse(playlist.tracksString);
    setTracks(tracks);
  };

  const toggleShow = () => {
    setShowMode(!showMode);
  };

  return (
    <Page name={showMode ? 'Showtime!' : 'Practice Time'}>
      <TableContainer whiteSpace={'wrap'} width={'100%'}>
        <HStack justifyContent={'space-between'}>
          <Flex flexGrow={1}>
            {!showMode &&
              <Button colorScheme={'green'} onClick={selectDanceModalDisclosure.onOpen}>+ Add Dance</Button>}
          </Flex>
          <>
            <Menu>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                Playlist Actions...
              </MenuButton>
              <MenuList>
                {!showMode &&<MenuItem icon={<MdFileOpen />} onClick={selectPlaylistModalDisclosure.onOpen}>Load...</MenuItem>}
                {!showMode && <MenuItem icon={<MdSave />} onClick={savePlaylistModalDisclosure.onOpen}>Save...</MenuItem>}
                {!showMode && <MenuItem icon={<MdCleaningServices />} onClick={() => setTracks([])}>Clear</MenuItem>}
                <MenuGroup title="Showtime">
                  <MenuItem onClick={toggleShow}>{showMode ? 'Stop show' : 'Run show!'}</MenuItem>
                </MenuGroup>
              </MenuList>
            </Menu>
          </>
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
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
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
      <SelectDanceModal onSubmit={addTrack} />
      <SavePlaylistModal onSubmit={savePlaylist} />
      <SelectPlaylistModal onSubmit={loadPlaylist} />
    </Page>
  );
};
