import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { mockDevice } from '@device/mockDevice';

export const DeviceStatusBar: React.FC = () => {
  const [status, setStatus] = useState({
    connected: true,
    batteryLevel: 85,
    wifiStrength: 80,
  });

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const deviceStatus = await mockDevice.getStatus();
        setStatus({
          connected: true,
          batteryLevel: Math.round(deviceStatus.batteryLevel),
          wifiStrength: Math.round(deviceStatus.wifiStrength),
        });
      } catch (error) {
        setStatus((prev) => ({ ...prev, connected: false }));
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, []);

  const getBatteryColor = () => {
    if (status.batteryLevel > 50) return 'text-green-600';
    if (status.batteryLevel > 20) return 'text-amber-600';
    return 'text-red-600';
  };

  const getWifiColor = () => {
    if (status.wifiStrength > 70) return 'text-green-600';
    if (status.wifiStrength > 40) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <View
      className="bg-gray-50 px-4 py-3 border-b border-gray-200"
      accessibilityLabel={`Device status: ${status.connected ? 'connected' : 'disconnected'}, battery ${status.batteryLevel}%, WiFi ${status.wifiStrength}%`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className={`text-sm mr-4 ${status.connected ? 'text-green-600' : 'text-red-600'}`}>
            {status.connected ? '● Connected' : '● Disconnected'}
          </Text>
        </View>

        <View className="flex-row items-center space-x-4">
          <View className="flex-row items-center">
            <Text className="text-xs text-gray-600 mr-1">🔋</Text>
            <Text className={`text-xs font-medium ${getBatteryColor()}`}>
              {status.batteryLevel}%
            </Text>
          </View>

          <View className="flex-row items-center">
            <Text className="text-xs text-gray-600 mr-1">📶</Text>
            <Text className={`text-xs font-medium ${getWifiColor()}`}>
              {status.wifiStrength}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

