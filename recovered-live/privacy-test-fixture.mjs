// Local synthetic D1 adapter; never reads production records.
import {DatabaseSync} from 'node:sqlite';
export function privacyFixture(){
 const db=new DatabaseSync(':memory:');
 const env={JWT_SECRET:'synthetic-test-key-not-a-production-credential',DB:{prepare(sql){let args=[];return{bind(...values){args=values;return this},async run(){return{meta:db.prepare(sql).run(...args)}},async first(){return db.prepare(sql).get(...args)||null},async all(){return{results:db.prepare(sql).all(...args)}}}},async batch(statements){db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}}};
 return{db,env};
}
export function optInTestAi(env,db,actor){
 env.DB.batch=async statements=>{const results=[];for(const s of statements)results.push(await s.run());return results};
 db.exec('CREATE TABLE IF NOT EXISTS userPrivacyChoices(actor TEXT PRIMARY KEY,aiProcessing INTEGER,aiMemory INTEGER,updatedAt TEXT)');
 db.prepare('INSERT INTO userPrivacyChoices(actor,aiProcessing,aiMemory) VALUES(?,1,1)').run(actor);
 return env;
}
