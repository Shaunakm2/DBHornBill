/* store-stub.js — the persistence layer the suites run against.

   This is the browser database that used to live inside app.js, lifted out
   unchanged. The twenty suites were written against its behaviour, including
   how a reload restores a session, so reproducing that behaviour by hand would
   only introduce differences. Production uses sync.js instead; the rules that
   only a server can enforce are tested in tests/01_policies.sql.

   Not shipped. This file belongs in tests/, never at the repository root. */
/* ================================================================ local database */
window.Store=(function(){
  /* app.js keeps its model private, so reach it through the bridge. */
  function A(){return window.APP||{};}
  var NAME='recruitment_ats_sandbox',VER=1,idb=null,timer=null;
  var api={available:false,ready:false,lastSaved:null,reason:'not initialised'};
  function open(){
    return new Promise(function(res,rej){
      var IDB=(typeof window!=='undefined')&&(window.indexedDB||window.mozIndexedDB||window.webkitIndexedDB);
      if(!IDB){rej(new Error('This browser or preview frame does not expose IndexedDB.'));return;}
      var rq;
      try{rq=IDB.open(NAME,VER);}catch(e){rej(e);return;}
      rq.onupgradeneeded=function(){
        var d=rq.result;
        if(!d.objectStoreNames.contains('state'))d.createObjectStore('state');
        if(!d.objectStoreNames.contains('files'))d.createObjectStore('files');
      };
      rq.onsuccess=function(){idb=rq.result;api.available=true;res(idb);};
      rq.onerror=function(){rej(rq.error||new Error('Could not open the local database.'));};
      rq.onblocked=function(){rej(new Error('The local database is blocked by another open tab.'));};
    });
  }
  function tx(store,mode,fn){
    return new Promise(function(res,rej){
      if(!idb){rej(new Error('No database'));return;}
      var t=idb.transaction(store,mode),s=t.objectStore(store),out;
      try{out=fn(s);}catch(e){rej(e);return;}
      t.oncomplete=function(){res(out&&out.result!==undefined?out.result:out);};
      t.onerror=function(){rej(t.error);};
    });
  }
  api.init=function(){
    return open().then(function(){
      return tx('state','readonly',function(s){return s.get('current');});
    }).then(function(rec){
      api.ready=true;api.reason='Local database active';
      return rec||null;
    }).catch(function(e){
      api.available=false;api.ready=true;api.reason=e.message||String(e);
      return null;
    });
  };
  /* Resume text is the bulk of the dataset, so it is stored per candidate rather than
     inside the state record. Only changed resumes are rewritten. */
  var cvDirty={},cvAll=false;
  api.markCV=function(id){cvDirty[id]=true;};
  api.markAllCV=function(){cvAll=true;};
  function stripped(){
    var out={},k;
    for(k in A().DB){
      if(k==='candidates')continue;
      out[k]=A().DB[k];
    }
    out.candidates=A().DB.candidates.map(function(c){
      var copy={},f;
      for(f in c){
        if(f==='cv')continue;
        if(f==='files'){
          copy.files=(c.files||[]).map(function(x){
            var y={},g;for(g in x){if(g!=='text')y[g]=x[g];}return y;});
          continue;
        }
        copy[f]=c[f];
      }
      return copy;
    });
    return out;
  }
  function writeCVs(){
    if(!api.available)return Promise.resolve();
    var ids=cvAll?A().DB.candidates.map(function(c){return c.id;}):Object.keys(cvDirty);
    if(!ids.length)return Promise.resolve();
    cvAll=false;cvDirty={};
    return tx('files','readwrite',function(st){
      ids.forEach(function(id){
        var c=A().byId(A().DB.candidates,id);
        if(!c)return;
        if(c.cv)st.put(c.cv,'cv:'+id);else st.delete('cv:'+id);
      });
    }).catch(function(){});
  }
  api.save=function(force){
    if(!api.available||!api.ready)return;
    if(timer)clearTimeout(timer);
    var run=function(){
      timer=null;
      var payload={savedAt:new Date().toISOString(),version:VER,data:stripped(),seq:A().SEQ};
      tx('state','readwrite',function(s){return s.put(payload,'current');})
        .then(function(){api.lastSaved=payload.savedAt;return writeCVs();})
        .catch(function(e){api.available=false;api.reason='Save failed: '+(e.message||e);});
    };
    if(force)run();else timer=setTimeout(run,900);
  };
  api.hydrateCVs=function(){
    if(!api.available)return Promise.resolve(0);
    return new Promise(function(res){
      var n=0;
      try{
        var t=idb.transaction('files','readonly'),st=t.objectStore('files');
        var rq=st.openCursor();
        rq.onsuccess=function(){
          var cur=rq.result;
          if(!cur){res(n);return;}
          var k=String(cur.key||'');
          if(k.indexOf('cv:')===0){
            var c=A().byId(A().DB.candidates,k.slice(3));
            if(c&&typeof cur.value==='string'){
              c.cv=cur.value;n++;
              (c.files||[]).forEach(function(f){if(f.isResume&&!f.text)f.text=cur.value;});
            }
          }
          cur.continue();
        };
        rq.onerror=function(){res(n);};
      }catch(e){res(n);}
    });
  };
  api.load=function(){
    if(!api.available)return Promise.resolve(null);
    return tx('state','readonly',function(s){return s.get('current');});
  };
  api.clear=function(){
    if(!api.available)return Promise.resolve();
    return tx('state','readwrite',function(s){return s.delete('current');})
      .then(function(){return tx('files','readwrite',function(s){return s.clear();});})
      .then(function(){api.lastSaved=null;});
  };
  api.putFile=function(key,blob){
    if(!api.available)return Promise.resolve();
    return tx('files','readwrite',function(s){return s.put(blob,key);}).catch(function(){});
  };
  api.countFiles=function(){
    if(!api.available)return Promise.resolve(0);
    return tx('files','readonly',function(s){return s.count();}).catch(function(){return 0;});
  };
  /* The one method sync.js adds that the suites also need. It applies the
     move and resolves; the refusals it mirrors in production come from the
     database and are tested there. */
  api.advance=function(subId,toLabel){
    var DB=window.APP&&window.APP.DB, sub=null;
    (DB&&DB.subs||[]).forEach(function(s){if(s.id===subId)sub=s;});
    if(!sub)return Promise.reject(new Error('No such submission'));
    sub.status=toLabel;
    sub.modified=new Date().toISOString();
    (sub.history=sub.history||[]).push({status:toLabel,at:sub.modified,
      by:(DB.me||'A. Trainee')});
    return Promise.resolve(sub);
  };
  api.addMessage=function(){return Promise.resolve({});};
  api.duplicateCheck=function(){return Promise.resolve([]);};
  api.markNotificationsRead=function(){return Promise.resolve();};
  api.scorecard=function(){return Promise.resolve([]);};
  api.queue=function(){return Promise.resolve([]);};
  api.signOut=function(){return Promise.resolve();};
  return api;
})();
