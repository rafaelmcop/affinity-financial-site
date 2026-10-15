// Published content only; never copy entire database rows to the public API.
export const publicTestimonialColumns='id,name,role,quote,rating,mediaUrl,mediaType,thumbnailUrl,isActive,language,createdAt,amountReceived,city,state';
export function publicTestimonial(row){const result={};for(const key of publicTestimonialColumns.split(','))if(Object.hasOwn(row,key))result[key]=row[key];if(row.displayedLanguage)result.displayedLanguage=row.displayedLanguage;result.id=Number(row.id);result.rating=Number(row.rating);result.isActive=Number(row.isActive);return result;}
