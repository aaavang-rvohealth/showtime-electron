import { createContext, useEffect, useState } from 'react';
import { useLocalStorage } from 'react-use';


export type UserSettings = {
  enableFineGrainAutoplay: boolean
  useHTML5Audio: boolean
  isWindows: boolean
}

const defaultUserSettings = {
  enableFineGrainAutoplay: false,
  useHTML5Audio: false,
  isWindows: true,
};

export const UserSettingsContext = createContext([defaultUserSettings, (settings: UserSettings) => {}] as [UserSettings, (settings: UserSettings) => void]);

export const useUserSettings = () => {
  const userState = useLocalStorage("userSettings", defaultUserSettings);

  useEffect(() => {
    window.electron.ipcRenderer.once('getPlatform', (platform: any) => {
      console.log('setting platform', platform)
      if (platform === 'win32') {
        userState[1]({
          ...userState[0],
          isWindows: true
        } as any);
      } else {
        userState[1]({
          ...userState[0],
          isWindows: false
        } as any);
      }
    });

    window.electron.ipcRenderer.sendMessage('getPlatform');
  }, []);

  return userState
}

export const UserSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [userSettings, setUserSettings] = useLocalStorage("userSettings", defaultUserSettings);

  console.log('user settings', userSettings)

  useEffect(() => {
    window.electron.ipcRenderer.once('getPlatform', (platform: any) => {
      if (platform === 'win32') {
        setUserSettings({
          ...userSettings,
          isWindows: true
        } as any);
      }
    });

    window.electron.ipcRenderer.sendMessage('getPlatform');
  }, []);

  return <UserSettingsContext.Provider value={[userSettings!, setUserSettings] as [UserSettings, (settings: UserSettings) => void]}>{children}</UserSettingsContext.Provider>;
}
