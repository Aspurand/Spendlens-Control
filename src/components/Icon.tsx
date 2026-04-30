import type { SVGProps } from 'react';

/** Slim line-icon set ported from the design pass. Stroke uses
 *  currentColor so each icon takes its color from the surrounding
 *  text. Add new icons here as needed; keep them at 24×24 viewbox. */
export type IconName =
  | 'home' | 'wallet' | 'calendar' | 'target' | 'debt' | 'card' | 'pie'
  | 'sparkles' | 'settings' | 'plus' | 'arrowUp' | 'arrowDown' | 'arrowRight'
  | 'chevronRight' | 'chevronDown' | 'chevronLeft' | 'search' | 'bell' | 'check'
  | 'x' | 'close' | 'trend' | 'receipt' | 'info' | 'sun' | 'moon' | 'bolt'
  | 'food' | 'car' | 'cart' | 'bill' | 'health' | 'music' | 'house'
  | 'keyboard' | 'download' | 'filter' | 'refresh' | 'shield' | 'eye';

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name' | 'stroke'> {
  name: IconName;
  size?: number;
  stroke?: number;
}

const PATHS: Record<IconName, JSX.Element> = {
  home:        <><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2v-9z"/></>,
  wallet:      <><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="17" cy="14" r="1.2" fill="currentColor" stroke="none"/></>,
  calendar:    <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
  target:      <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></>,
  debt:        <><path d="M3 6h18M3 12h18M3 18h12"/><path d="M17 16l4 2-4 2"/></>,
  card:        <><rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 9.5h19M6 15h4"/></>,
  pie:         <><path d="M12 3v9l8 4a9 9 0 1 1-8-13z"/></>,
  sparkles:    <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/></>,
  settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  plus:        <><path d="M12 5v14M5 12h14"/></>,
  arrowUp:     <><path d="M7 11l5-5 5 5M12 6v13"/></>,
  arrowDown:   <><path d="M7 13l5 5 5-5M12 5v13"/></>,
  arrowRight:  <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  chevronRight:<><path d="M9 6l6 6-6 6"/></>,
  chevronDown: <><path d="M6 9l6 6 6-6"/></>,
  chevronLeft: <><path d="M15 18l-6-6 6-6"/></>,
  search:      <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
  bell:        <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  check:       <><path d="M5 12l4 4L19 6"/></>,
  x:           <><path d="M6 6l12 12M6 18L18 6"/></>,
  close:       <><path d="M6 6l12 12M6 18L18 6"/></>,
  trend:       <><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></>,
  receipt:     <><path d="M5 3v18l3-2 3 2 3-2 3 2 3-2V3z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  info:        <><circle cx="12" cy="12" r="9"/><path d="M12 8v0M11 12h1v5h1"/></>,
  sun:         <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></>,
  moon:        <><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></>,
  bolt:        <><path d="M13 3L4 14h7l-1 7 9-11h-7z"/></>,
  food:        <><path d="M3 11h18M5 11v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6M8 11V8a4 4 0 0 1 8 0v3"/></>,
  car:         <><path d="M5 13l2-5h10l2 5M3 17h18M5 13v4M19 13v4"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></>,
  cart:        <><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.6 11.4A2 2 0 0 0 9.6 17H17a2 2 0 0 0 2-1.6L20.5 8H6"/></>,
  bill:        <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 11h18M7 16h4"/></>,
  health:      <><path d="M12 21s-7-5-9-10A5 5 0 0 1 12 6a5 5 0 0 1 9 5c-2 5-9 10-9 10z"/></>,
  music:       <><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></>,
  house:       <><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2v-9z"/></>,
  keyboard:    <><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12"/></>,
  download:    <><path d="M12 4v12M6 12l6 6 6-6M4 20h16"/></>,
  filter:      <><path d="M4 5h16l-6 8v6l-4-2v-4z"/></>,
  refresh:     <><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></>,
  shield:      <><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/></>,
  eye:         <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
};

export function Icon({ name, size = 18, stroke = 1.7, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size} height={size}
      fill="none"
      stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
