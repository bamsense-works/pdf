const a=(e,t)=>{try{const r=localStorage.getItem(e);return r?JSON.parse(r):t}catch{return t}},s=(e,t)=>{try{localStorage.setItem(e,JSON.stringify(t))}catch{}};export{a as l,s};
