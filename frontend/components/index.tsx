/**
 * AudioFlow Component Library
 * Central export for incremental adoption in React-based surfaces.
 */

import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import Chip from './ui/Chip';
import Avatar from './ui/Avatar';
import FAB from './ui/FAB';
import Header from './layout/Header';
import BottomNav, { BottomNavItem } from './layout/BottomNav';
import tokens from '../lib/tokens';
import brandAssets, { brandMetadata } from '../lib/brand-assets';

const ui = {
  Button,
  Card,
  Input,
  Chip,
  Avatar,
  FAB,
};

const layout = {
  Header,
  BottomNav,
  BottomNavItem,
};

export {
  Avatar,
  BottomNav,
  BottomNavItem,
  Button,
  Card,
  Chip,
  FAB,
  Header,
  Input,
  brandAssets,
  brandMetadata,
  tokens,
};

export * from '../lib/tokens';
export * from '../lib/brand-assets';

export const audioFlowReactComponents = ui;
export const audioFlowLayoutComponents = layout;

export const audioFlowComponentLibrary = {
  ui,
  layout,
  tokens,
  brandAssets,
  brandMetadata,
};

export default audioFlowComponentLibrary;
