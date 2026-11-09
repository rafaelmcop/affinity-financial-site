// Classify by published content, so a client-submitted video never enters the written-review carousel.
export const isVideoTestimonial=item=>item?.mediaType==='video'&&typeof item.mediaUrl==='string'&&item.mediaUrl.trim().length>0;
