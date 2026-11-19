// Web-only destination for the email subdomain. No mailbox or mail routing changes.
export default {
  fetch(request) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', {status:405,headers:{allow:'GET, HEAD'}});
    }
    return new Response(null, {
      status:301,
      headers:{
        location:'https://www.affinityfc.org/',
        'cache-control':'public, max-age=3600',
        'strict-transport-security':'max-age=31536000',
        'referrer-policy':'no-referrer',
        'x-content-type-options':'nosniff'
      }
    });
  }
};
