import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { mockDevice } from '@device/mockDevice';

export const DeviceStatusBar: React.FC = () => {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const ok = await mockDevice.checkConnection();
        setConnected(ok);
      } catch {
        setConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View
      className="bg-gray-50 px-4 py-2 border-b border-gray-200"
      accessibilityLabel={`Device status: ${connected ? 'connected' : 'disconnected'}`}
    >
      <View className="flex-row items-center">
        <Text className={`text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>
          {connected ? '● Connected' : '● Disconnected'}
        </Text>
      </View>
    </View>
  );
};
