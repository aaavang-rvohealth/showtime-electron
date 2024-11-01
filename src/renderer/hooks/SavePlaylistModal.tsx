import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
  useToast,
  VStack
} from '@chakra-ui/react';
import React, { useCallback, useState } from 'react';
import { database, Playlist } from '../database';

export type SavePlaylistModalProps = {
  onSubmit: (data: Playlist) => void;
  disclosure: ReturnType<typeof useDisclosure>;
  initialValue?: Partial<Playlist>;
}

export type SavePlaylistModalHookProps = {
  onSubmit: (data: Playlist) => void;
  initialValue?: Partial<Playlist>;
}

export const useSavePlaylistModal = (): [ReturnType<typeof useDisclosure>, (props: SavePlaylistModalHookProps) => React.ReactNode] => {
  const savePlaylistModal = useDisclosure();
  return [savePlaylistModal, ({ onSubmit, initialValue }: SavePlaylistModalHookProps) => <SavePlaylistModal onSubmit={onSubmit}
                                                                                                           initialValue={initialValue}
                                                                                              disclosure={savePlaylistModal} />];
};

const SavePlaylistModal = ({ onSubmit, disclosure, initialValue }: SavePlaylistModalProps) => {
  const toast = useToast();
  const [newPlaylist, setNewPlaylist] = useState(initialValue ?? {} as Partial<Playlist>);

  const wrappedOnSubmit = useCallback(async () => {
    const existingPlaylist = await database.playlists.where('title').equals(newPlaylist.title!).first();
    if (!newPlaylist.id && existingPlaylist) {
      toast({
        title: 'Playlist already exists',
        description: 'A playlist with that title already exists. Please choose a different title.',
        status: 'error',
        duration: 2000,
        isClosable: true,
      })
      return;
    }

    onSubmit(newPlaylist as Playlist);
    disclosure.onClose();
  }, [newPlaylist, onSubmit]);

  return (
    <Modal isOpen={disclosure.isOpen} onClose={disclosure.onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Save Playlist</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack gap={'5px'}>
            <>
              <Text key={'title-label'}>Title</Text>
              <Input key={'title-input'} value={newPlaylist.title ?? ''}
                     onChange={(e) => {
                       const newState = { ...newPlaylist };
                       newState.title = e.target.value;
                       setNewPlaylist(newState);
                     }} />
            </>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={() => wrappedOnSubmit()}>
            Save
          </Button>
          <Button variant="ghost" onClick={disclosure.onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
