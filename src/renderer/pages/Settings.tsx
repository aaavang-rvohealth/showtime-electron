import { FormLabel } from '@chakra-ui/icons';
import { Card, CardBody, Checkbox, FormControl, HStack, Text, useColorMode } from '@chakra-ui/react';
import { useContext } from 'react';
import { Page } from '../common/Page';
import { UserSettingsContext } from '../providers/UserSettingsProvider';

export const Settings = () => {
  const [userSettings, setUserSettings] = useContext(UserSettingsContext);
  const { colorMode, toggleColorMode } = useColorMode()
  return (
    <Page name={'Settings'}>
      <Card>
        <CardBody>
          <FormControl>
            <HStack gap={'15px'} alignItems={'center'} textAlign={'center'}>
              <Text>Dark Mode</Text>
              <Checkbox
                isChecked={colorMode === 'dark'}
                onChange={toggleColorMode}
              />
            </HStack>
            <Text fontSize={'xs'}>Select whether to use light or dark mode.</Text>
          </FormControl>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <FormControl>
            <HStack gap={'15px'} alignItems={'center'} textAlign={'center'}>
              <Text>Enable Fine-Grained Autoplay</Text>
              <Checkbox
                isChecked={userSettings.enableFineGrainAutoplay}
                onChange={(e) => {
                  setUserSettings({ ...userSettings, enableFineGrainAutoplay: e.target.checked });
                }}
              />
            </HStack>
            <Text fontSize={'xs'}>When enabled, you can mark certain tracks to autoplay.</Text>
          </FormControl>
        </CardBody>
      </Card>
    </Page>
  );
};
