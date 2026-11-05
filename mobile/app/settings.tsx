import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Screen } from '../src/components/layout/Screen';
import { CustomButton, CustomCard, InputField } from '../src/components/ui';
import { householdApi } from '../src/services/api/household';
import { getBaseUrl, setBaseUrl } from '../src/services/storage/baseUrl';
import { useTheme } from '../src/theme';
import { errorMessage } from '../src/utils/format';

export default function SettingsScreen() {
  const { colors, type } = useTheme();
  const [url, setUrl] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBaseUrl().then(setUrl).catch(() => undefined);
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await setBaseUrl(url);
      const healthy = await householdApi.pingHealth();
      if (healthy) {
        setNotice('Saved. The API answered /health.');
        return;
      }
      await householdApi.getMembers();
      setNotice('Saved. Household API is reachable.');
    } catch (err) {
      setError(errorMessage(err, 'Could not reach that address.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <CustomCard>
        <Text style={[type.heading, { color: colors.text }]}>API address</Text>
        <Text style={[type.body, { color: colors.muted }]}>
          Use your computer LAN IP when the phone is not on the simulator. Example: http://192.168.1.20:8080
        </Text>
        <InputField label="Base URL" value={url} onChangeText={setUrl} autoCapitalize="none" placeholder="http://127.0.0.1:8080" />
        <CustomButton label="Save and test" onPress={() => void save()} loading={saving} />
        {notice ? <Text style={{ color: colors.success }}>{notice}</Text> : null}
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      </CustomCard>
    </Screen>
  );
}
