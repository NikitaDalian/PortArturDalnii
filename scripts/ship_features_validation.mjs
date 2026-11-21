export function validateShipFeatures(records,hardware,profileProvenance){
  const errors=[];
  const ships=new Map(hardware.filter(item=>item.kind==='ship').map(item=>[item.slug,item]));
  const ids=new Set();
  const nonempty=value=>typeof value==='string'&&value.trim().length>0;
  for(const record of records){
    const prefix=`ship_features/${record.shipSlug}`;
    const ship=ships.get(record.shipSlug);
    if(!ship||ids.has(record.shipSlug)){errors.push(`${prefix}: unknown or duplicate ship`);continue;}
    ids.add(record.shipSlug);
    if(!ship.images.some(image=>image.file===record.photoFile && !image.kind))errors.push(`${prefix}: annotation photo must belong to this ship`);
    if(!nonempty(record.period))errors.push(`${prefix}: missing dated scope`);
    if(!Array.isArray(record.features)||record.features.length<3||record.features.length>6){errors.push(`${prefix}: expected 3–6 reviewed zones`);continue;}
    const features=new Set();
    const photoUrls=new Set([...ship.images.map(image=>image.sourceUrl),...(profileProvenance.ships.find(row=>row.shipSlug===ship.slug)?.references??[]).map(ref=>ref.url)]);
    for(const feature of record.features){
      const name=`${prefix}/${feature.id}`;
      if(!/^[a-z][a-z0-9-]*$/.test(feature.id)||features.has(feature.id))errors.push(`${name}: invalid or duplicate feature ID`);
      features.add(feature.id);
      if(!nonempty(feature.label)||!nonempty(feature.text))errors.push(`${name}: empty explanation`);
      if(![feature.x,feature.y].every(value=>Number.isFinite(value)&&value>=0&&value<=100))errors.push(`${name}: invalid profile coordinates`);
      if('lat' in feature||'lng' in feature||'lat' in record||'lng' in record)errors.push(`${name}: geographic coordinates forbidden`);
      if(feature.weaponSlug!==null&&!ship.armament.some(gun=>gun.weaponSlug===feature.weaponSlug))errors.push(`${name}: weapon not documented on this ship`);
      if(!Array.isArray(feature.refs)||feature.refs.some(ref=>!ship.sources.some(source=>source.id===ref)))errors.push(`${name}: unknown ship source`);
      if(!Array.isArray(feature.sourceUrls)||feature.sourceUrls.some(url=>!photoUrls.has(url)))errors.push(`${name}: unreviewed visual source`);
      if(!(feature.refs?.length||feature.sourceUrls?.length))errors.push(`${name}: unsourced explanation`);
    }
  }
  if([...ships.values()].some(ship=>!ids.has(ship.slug)&&ship.images.some(image=>!image.kind)))errors.push('ship_features: every published ship needs a reviewed profile if it has a photograph');
  return errors;
}
