import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export type AppTabBarProps = Pick<BottomTabBarProps, 'state' | 'descriptors' | 'insets'> & {
  navigation?: BottomTabBarProps['navigation'];
  navigateToTab?: (routeKey: string) => void;
};

export function pressTab(
  props: AppTabBarProps,
  routeKey: string,
  routeName: string,
  focused: boolean,
): void {
  if (props.navigation) {
    const event = props.navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      props.navigation.navigate(routeName);
    }
    return;
  }
  if (!focused && props.navigateToTab) props.navigateToTab(routeKey);
}
