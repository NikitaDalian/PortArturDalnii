import guide from '../data/zhongshan_buildings.json';
import points from '../components/map/zhongshan-points.json';
import { locale } from '../i18n/locale';

export const squareSlug = 'nikolaevskaya-ploshchad';
export const squareMapLabel = { ru:'Здания площади Чжуншань', en:'Buildings on Zhongshan Square', zh:'中山广场建筑' }[locale];
export const mapLinkLabel = { ru:'На карте', en:'View on map', zh:'在地图上查看' }[locale];
export const squareBuildings = guide.buildings.map(building => {
  const point = points.find(entry => entry.number === building.number);
  if (!point || (building.place && building.place !== point.slug)) throw new Error('Missing or mismatched address on Zhongshan Square: ' + building.number);
  const address = { ru:'Площадь Чжуншань, ' + point.number, en:point.number + ' Zhongshan Square', zh:'中山广场' + point.number + '号' }[locale];
  return { ...building, ...point, address };
});
export const squareBuildingBySlug = new Map(squareBuildings.map(building => [building.slug, building]));
export function buildingSources(slug: string) {
  const building = squareBuildingBySlug.get(slug);
  if (!building) return [];
  return [
    ...building.sources.map(id => guide.sources[id as keyof typeof guide.sources]).map(s => ({title:s.label, url:s.url})),
    {title:'OpenStreetMap · ' + building.address, url:building.source},
  ];
}
