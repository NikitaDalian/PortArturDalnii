export function validateReadingNotes(records,articles,essays){
  const errors=[];
  const present=value=>typeof value==='string'&&!!value.trim();
  const byNote=new Map(articles.map(item=>[item.slug,[item.summary,...item.facts].join(' ')]));
  const byEssay=new Map(essays.map(item=>[item.slug,item.sections.flatMap(section=>section.paragraphs).join(' ')]));
  if(!records.length||new Set(records.map(item=>item.slug)).size!==records.length)errors.push('reading_notes: empty or duplicate identities');
  for(const note of records){
    const name=`reading_notes/${note.slug}`;
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(note.slug)||!present(note.label)||!present(note.description)||note.description.length>850)errors.push(`${name}: invalid identity or explanation`);
    if(!Array.isArray(note.aliases)||!note.aliases.length||new Set(note.aliases).size!==note.aliases.length||note.aliases.some(alias=>!present(alias)||alias.length<2||alias.length>90))errors.push(`${name}: invalid aliases`);
    if(!note.sources?.length||note.sources.some(source=>!present(source.title)||!/^https:\/\//.test(source.url)))errors.push(`${name}: missing checked source`);
    if(!note.relatedNotes?.length&&!note.relatedEssays?.length)errors.push(`${name}: explanation must be scoped to a reviewed text`);
    for(const [field,known] of [['relatedNotes',byNote],['relatedEssays',byEssay]]){
      if(!Array.isArray(note[field])||new Set(note[field]).size!==note[field].length){errors.push(`${name}: invalid scope list`);continue;}
      for(const slug of note[field]){
        if(!known.has(slug))errors.push(`${name}: unknown scoped text ${slug}`);
        else if(![note.label,...(note.aliases??[])].some(alias=>known.get(slug).includes(alias)))errors.push(`${name}: no exact visible mention in ${slug}`);
      }
    }
  }
  return errors;
}
