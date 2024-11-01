import { createContext, useEffect, useState } from 'react';


export type UserSettings = {
  defaultAutoplay: boolean
  isWindows: boolean
}

const defaultUserSettings = {
  defaultAutoplay: false,
  isWindows: true
};

export const UserSettingsContext = createContext([defaultUserSettings, (userSettings: UserSettings) => {}] as ReturnType<typeof useUserSettings>);

export const useUserSettings = () => {
  const userState = useState(defaultUserSettings)

  useEffect(() => {
    const storedUserSettings = localStorage.getItem('userSettings');
    if (storedUserSettings) {
      userState[1](JSON.parse(storedUserSettings));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(userState[0]));
  }, [userState[0]]);

  useEffect(() => {
    window.electron.ipcRenderer.once('getPlatform', (platform: any) => {
      if (platform === 'win32') {
        userState[1]({
          ...userState[0],
          isWindows: true
        });
      } else {
        userState[1]({
          ...userState[0],
          isWindows: false
        });
      }
    });

    window.electron.ipcRenderer.sendMessage('getPlatform');
  }, []);

  return userState
}

export const UserSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const userSettings = useUserSettings()

  useEffect(() => {
    window.electron.ipcRenderer.once('getPlatform', (platform: any) => {
      if (platform === 'win32') {
        userSettings[1]({
          ...userSettings[0],
          isWindows: true
        });
      }
    });

    window.electron.ipcRenderer.sendMessage('getPlatform');
  }, []);

  return <UserSettingsContext.Provider value={userSettings}>{children}</UserSettingsContext.Provider>;
}
