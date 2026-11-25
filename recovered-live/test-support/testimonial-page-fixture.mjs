import {DatabaseSync} from 'node:sqlite';
export function testimonialPageFixture(){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE testimonials(id INTEGER PRIMARY KEY,name TEXT,role TEXT,quote TEXT,rating INTEGER,mediaUrl TEXT,mediaType TEXT,thumbnailUrl TEXT,isActive INTEGER,language TEXT,createdAt TEXT,amountReceived REAL,city TEXT,state TEXT,source TEXT,email TEXT,agentEmail TEXT)');
 const insert=db.prepare('INSERT INTO testimonials(id,name,role,quote,rating,mediaUrl,mediaType,thumbnailUrl,isActive,language,createdAt,amountReceived,city,state,source,email,agentEmail) VALUES(?,?,?,?,5,?,?,?,?,?,CURRENT_TIMESTAMP,100000,NULL,NULL,\'manual\',\'private@example.invalid\',\'private-agent@example.invalid\')');
 const rows=[
  [1,'Pessoa de exemplo','Condição relatada','História completa do benefício. '.repeat(120),'https://vimeo.com/123456789/abcdef1234','video',null,1,'pt'],
  [2,'Outro depoimento','Benefício em vida','Outra história.','https://www.youtube.com/watch?v=abcdefghijk','video',null,1,'pt'],
  [3,'English video','Living benefit','English story.','https://vimeo.com/223456789','video',null,1,'en'],
  [4,'PRIVATE UNPUBLISHED','Do not expose','Private text.','https://vimeo.com/323456789','video',null,0,'pt'],
  [5,'Written review','Benefício','No video.',null,'image',null,1,'pt'],
  [6,'<script>alert(1)</script>','<img src=x onerror=alert(1)>','<svg onload=alert(1)>','/media/synthetic.mp4','video','javascript:alert(1)',1,'es']
 ];for(const row of rows)insert.run(...row);
 const env={DB:{prepare(sql){
  let args=[];
  return {
   bind(...values){args=values;return this},
   async first(){return db.prepare(sql).get(...args)},
   async all(){return{results:db.prepare(sql).all(...args)}}
  };
 }}};

 return{db,env};
}
