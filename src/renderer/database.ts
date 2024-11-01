import Dexie, { EntityTable } from 'dexie';
import dexieRelationships from 'dexie-relationships';
import relationships from 'dexie-relationships'

export type Song = {
  id: number;
  title: string;
  path: string;
}

export type Dance = {
  id: number;
  title: string;
}

export type DanceVariant = {
  id: number;
  title: string;
  danceId: number;
  songId: number;
  defaultVariant: boolean;
}


export type Playlist = {
  id: number;
  title: string;
  tracksString: string;
}

export type PlaylistDance = {
  id: string;
  playlistId: number;
  danceVariantId: number;
  order: string;
}

export const database = new Dexie("showtime", {addons: [dexieRelationships]}) as Dexie & {
  songs: EntityTable<Song, 'id'>,
  dances: EntityTable<Dance, 'id'>,
  danceVariants: EntityTable<DanceVariant, 'id'>,
  playlists: EntityTable<Playlist, 'id'>,
  playlistDances: EntityTable<PlaylistDance, 'id'>,
}

database.version(1).stores({
  songs: "++id, title, path",
  dances: "++id, title, defaultSongId",
  playlists: "++id, title",
  danceVariants: "++id, title, danceId -> dances.id, songId -> songs.id",
  playlistDances: "++id, playlistId -> playlists.id, danceVariantId -> danceVariants.id, order",
});

database.open().catch(function(error){
  console.error("ERROR: "+ error);
});
