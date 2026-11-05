import { useUiConfig } from '../../store/uiConfig';
import { TabBarCenterAction } from './TabBarCenterAction';
import { TabBarFloating } from './TabBarFloating';
import { TabBarStandard } from './TabBarStandard';
import type { AppTabBarProps } from './types';

export function TabBarRouter(props: AppTabBarProps) {
  const { tabVariant } = useUiConfig();
  if (tabVariant === 'floating') return <TabBarFloating {...props} />;
  if (tabVariant === 'centerAction') return <TabBarCenterAction {...props} />;
  return <TabBarStandard {...props} />;
}
