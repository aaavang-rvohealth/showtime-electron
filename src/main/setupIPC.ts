import { ipcMain, dialog } from 'electron';
import fs from 'fs';
import os from 'node:os';
import { Song } from '../renderer/database';

export const setupIPC = () => {
  ipcMain.on('getPlatform', async (event, arg) => {
    event.reply('getPlatform',os.platform())
  })

  const audioFileExtensions: string[] = [
    "aac",   // Advanced Audio Codec
    "aiff",  // Audio Interchange File Format
    "alac",  // Apple Lossless Audio Codec
    "amr",   // Adaptive Multi-Rate
    "ape",   // Monkey's Audio
    "dss",   // Digital Speech Standard
    "flac",  // Free Lossless Audio Codec
    "gsm",   // Global System for Mobile Audio
    "m4a",   // MPEG 4 Audio
    "m4b",   // MPEG 4 Audio (audiobook)
    "m4p",   // MPEG 4 Audio (protected)
    "mmf",   // Yamaha Synthetic Music Mobile Application
    "mp3",   // MPEG Audio Layer III
    "mpc",   // Musepack
    "ogg",   // Ogg Vorbis
    "oga",   // Ogg Audio
    "opus",  // Opus Audio Codec
    "ra",    // Real Audio
    "rm",    // Real Media
    "wav",   // Waveform Audio
    "wma",   // Windows Media Audio
    "wv"     // WavPack
  ];

  ipcMain.on('selectAudioFile', async (event, arg) => {
    const paths = dialog.showOpenDialogSync({
      message: 'Select an audio file',
      properties: ['openFile'],
      filters: [
        { name: 'Audio Files', extensions: audioFileExtensions }
      ]
    })
    event.reply('selectAudioFile', paths?.[0])
  })

  ipcMain.on('getAudioFilesInDirectory', async (event, arg) => {
    const paths = dialog.showOpenDialogSync({
      message: 'Select a directory',
      properties: ['openDirectory']
    })


    if(!paths) {
      event.reply('selectDirectory', [])
      return
    }

    // recursively get all audio files in the directory
    const getAudioFiles = (dir: string): string[] => {
      const files = fs.readdirSync(dir)
      return files.flatMap(file => {
        const filePath = `${dir}/${file}`
        if (fs.statSync(filePath).isDirectory()) {
          return getAudioFiles(filePath)
        } else {
          const extension = file.split('.').pop()
          if (audioFileExtensions.includes(extension!)) {
            return [filePath]
          }
          return []
        }
      })
    }

    event.reply('getAudioFilesInDirectory', getAudioFiles(paths?.[0]))
  })

  ipcMain.on('exportPlaylist', async (event, arg) => {
    const {playlistTitle, xml} = arg
    const path = dialog.showSaveDialogSync({
      message: 'Select file to export playlist to',
      defaultPath: `${playlistTitle ?? 'Playlist'}.xspf`,
      filters: [
        { name: 'XSPF', extensions: ['xspf'] },
      ],
    })

    console.log('exporting playlist to', path)

    if(path) {
      fs.writeFileSync(path, xml)
    }

    event.reply('exportPlaylist', { path })
  });

  ipcMain.on('validateLibrary', async (event, arg) => {
    console.log('validateLibrary', arg)
    const {songs} = arg as {songs: Song[]}
    const invalidSongs: Song[] = []
    for (const song of songs) {
      console.log('validating', song)
      if (!song.path) {
        invalidSongs.push(song)
      }
      // validate if the song's path exists on the system
      if(!fs.existsSync(song.path)) {
        invalidSongs.push(song)
      }
    }
    event.reply('validateLibrary', { invalidSongs })
  });
};
