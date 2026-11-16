import { href } from './data';

// One navigation model for desktop, mobile and footer. URLs stay stable.
export const primaryNavigation = () => [
  { key: 'notes', label: 'Статьи и заметки', href: href.notes() },
  { key: 'hardware', label: 'Корабли и вооружение', href: href.hardwareIndex() },
  { key: 'layers', label: 'Эпохи', href: href.layers() },
  { key: 'places', label: 'Места и маршруты', href: href.places() },
  { key: 'people', label: 'Люди', href: href.people() },
  { key: 'library', label: 'Библиотека', href: href.library() },
];
export const navigationSection = (section?: string | null) =>
  section === 'map' || section === 'routes' ? 'places' : section;
