/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */


if (typeof OK === 'undefined') 
    var OK=
    (function(){
	var result={};
	var rooturi=false;
	var rootid=false;
	var block_specs=["P","H1","H2","H3","H4","H5","BLOCKQUOTE"];
	var refuris=[];
	
	var knotes={};
	var tags2knotes={};
	var frags2knotes={};
	var knote_servers=[];
	
	var run_time=100;
	var gap_time=100;
	
	var links=false;
	var meta=false;
	
	function getschemaprefix(url){
	    if (!(links)) links=document.getElementsByTagName('LINK');
	    var prefix=false;
	    var i=0; var lim=links.length;
	    while (i<lim) {
		if (links[i].href===url) {
		    var match=(/schema\.([^.]+)/.exec(links[i].rel))||
			(/([^.]+\.schema)/.exec(links[i].rel))||
			[links[i].rel];
		    return match[0];}
		else i++;}
	    return false;}
	
	function getinfo(ref){
	    if (knotes[ref]) return knotes[ref];}
	result.ref=getinfo;

	function newNode(spec){
	    var dot=spec.indexOf('.');
	    var hash=spec.indexOf('#');
	    var elt=((dot>0)?(document.createElement(spec.slice(0,dot))):
		     (hash>0)?(document.createElement(spec.slice(0,hash))):
		     (document.createElement(spec)));
	    if (dot>0) {
		var classes=
		    ((hash>0)?(spec.slice(dot+1,hash)):(spec.slice(dot+1)));
		elt.className=classes.replace(/\./g,' ');}
	    if (hash>0) elt.id=spec.slice(hash+1);
	    if (arguments.length>1) {
		var i=1; var lim=arguments.length;
		while (i<lim) {
		    var arg=arguments[i++];
		    if (!(arg)) {}
		    else if (typeof arg === 'string')
			elt.appendChild(document.createTextNode(arg));
		    else if (arg.nodeType)
			elt.appendChild(arg);
		    else elt.appendChild(document.createTextNode
					 (arg.toString()));}}
	    return elt;}
	function newImage(src,classname){
	    var elt=document.createElement("IMG");
	    if (classname) elt.className=classname;
	    elt.src=src;
	    return elt;}

	function getLink(name,results){
	    if (!(links)) links=document.getElementsByTagName('LINK');
	    var i=0; var lim=links.length;
	    while (i<lim) {
		if (links[i].rel===name) {
		    if (results) results.push(links[i++].href);
		    else return links[i].href;}
		else i++;}
	    return results||false;}

	function getMeta(name,results){
	    if (!(meta)) meta=document.getElementsByTagName('META');
	    var i=0; var lim=meta.length;
	    while (i<lim) {
		if (meta[i].name===name) {
 		    if (results) results.push(links[i++].content);
		    else return links[i].content;}
		else i++;}
	    return results||false;}

	function getInput(node,name,results){
	    var inputs=node.getElementsByTagName('INPUT');
	    var i=0; var lim=inputs.length;
	    while (i<lim) {
		if (inputs[i].name===name) {
 		    if (results) results.push(inputs[i++]);
		    else return inputs[i];}
		else i++;}
	    var inputs=node.getElementsByTagName('TEXTAREA');
	    var i=0; var lim=inputs.length;
	    while (i<lim) {
		if (inputs[i].name===name) {
 		    if (results) results.push(inputs[i++]);
		    else return inputs[i];}
		else i++;}
	    return results||false;}

	function getParent(node,classname){
	    var classpat=new RegExp("\\b"+classname+"\\b");
	    while (node) {
		if ((node.className)&&(node.className.search(classpat)>=0))
		    return node;
		else node=node.parentNode;}}
	function getForm(node){
	    while (node) {
		if ((node.tagName)&&(node.tagName==='FORM'))
		    return node;
		else node=node.parentNode;}
	    return false;}
	
	/* Startup */

	var startup_done=false;

	function startup(){
	    if (startup_done) return;
	    var prefix=getschemaprefix("http://openknotes.org/")||
		getschemaprefix("http://sbooks.net/")||
		"OK";
	    rooturi=OK.refuri||
		getLink(prefix+".refuri")||
		getLink("SBOOKS.refuri")||
		getLink("SB.refuri")||
		getLink("refuri")||
		getLink("canonical")||
		window.location.url;
	    if (rooturi.indexOf('#')>0) 
		rooturi=rooturi.slice(0,rooturi.indexOf('#'));
	    rootid=OK.rootid||
		getMeta(prefix+".baseid")||
		getMeta("SBOOKS.baseid")||
		getMeta("baseid");
	    if (!(rootid)) assign_ids();

	    var refuris=
		((getLink(prefix+".refuris"))&&(getLink(prefix+".refuris",[])))||
		((getLink("refuris"))&&(getLink("refuris",[])))||
		[rooturi];
	    
	    var servers=
		((getLink(prefix+".server"))&&(getLink(prefix+".server",[])))||
		[];
	    var saved=localStorage["openknote.servers"];
	    if (saved) servers=servers.concat(JSON.parse(saved));
	    OK.servers=servers;
	    
	    var i=0; var lim=refuris.length;
	    while (i<lim) {
		var j=0; var jlim=servers.length;
		while (j<jlim)
		    getKnotes(refuris[i],servers[j++]);
		i++;}
	    
	    window.onclick=add_knote_handler;

	    startup_done=true;}
	result.startup=startup;
	
	function addKnote(knote,server){
	    var id=knote._id; var frag=knote.frag;
	    if (knotes[id]) return false;
	    knotes[id]=knote;
	    if (frags2knotes[frag])
		frags2knotes[frag].push(id);
	    else frags2knotes[frag]=[id];
	    if ((knote.maker)&&(typeof knote.maker !== 'string')&&
		(knote.maker._id)) {
		var id=knote.maker._id;
		knotes[id]=knote.maker;
		knote.maker=id;}
	    if (knote.tags) {
		var tags=knote.tags;
		if (typeof tags === 'string') tags=[tags];
		var i=0; var lim=tags.length;
		while (i<lim) {
		    var tag=tags[i++];
		    if (tags2knotes[tag]) {
			tags2knotes[tag].push(id);
			tags2knotes[tag].push(frag);}
		    else tags2knotes[tag]=[id,frag];}}
	    addKnote2DOM(knote,"div.knote",server);
	    return true;}
	result.addKnote=addKnote;

	function addKnote2DOM(knote,spec,server){
	    if (!(spec)) spec="div.knote";
	    var id=knote._id;
	    var elt=document.getElementById(id);
	    if (elt) return elt;
	    var node=getNode4Knote(knote);
	    if (!(node)) {
		fdjtLog("No node for %o",knote);
		return;}
	    var knoteselt=getKnotes4DOM(node);
	    var elt=Knote2DOM(knote,spec,server);
	    knoteselt.appendChild(elt);}
	
	function getNode4Knote(knote){
	    return document.getElementById(knote.frag);}
	
	var open=false; var knoted=false;

	function toggle_knotes(evt){
	    evt=evt||event;
	    var target=evt.target||evt.fromElt;
	    var knotes=getParent(target,"knotes");
	    if (!(knotes)) return;
	    else if (knotes.className.search(/\bexpanded\b/)>=0) {
		knotes.className=knotes.className.replace(
			/\bexpanded\b/,"").replace(/\s$/,"");
		if (open) fdjtDOM.dropClass(open,"expanded");
		if (knoted) fdjtDOM.dropClass(knoted,"knoted");
		knoted=false;
		open=false;}
	    else {
		knotes.className=knotes.className+" expanded";
		if (open) fdjtDOM.dropClass(open,"expanded");
		if (knoted) fdjtDOM.dropClass(knoted,"knoted");
		var knotesid=knotes.id;
		var elt=document.getElementById(knotesid.slice(7));
		if (elt) fdjtDOM.addClass(elt,"knoted");
		knoted=elt;
		open=knotes;}}
	
	function getKnotes4DOM(node){
	    var knotesid="KNOTES4"+node.id;
	    var elt=document.getElementById(knotesid);
	    if (elt) return elt;
	    var asterisk=newNode("img.asterisk");
	    asterisk.src=
		"http://static.beingmeta.com/graphics/Asterisk32x32.png";
	    asterisk.alt="*";
	    elt=newNode("div.knotes",asterisk);
	    elt.id=knotesid;
	    asterisk.onclick=toggle_knotes;
	    node.parentNode.insertBefore(elt,node);
	    return elt;}

	function Knote2DOM(knote,spec,server){
	    var elt=newNode(spec);
	    var maker=knotes[knote.maker];
	    return newNode(
		spec," ",
		((maker)&&(maker.pic)&&(newImage(maker.pic,"userpic"))),
		newNode("span.maker",((maker)?(maker.name):(knote.maker)))," ",
		((knote.note)&&(newNode("span.knote",knote.note)))," ",
		((knote.tags)&&(tagspan(knote.tags)))," ",
		((knote.links)&&(linkspan(knote.links))));}

	function tagspan(tags){
	    if (!(tags)) return false;
	    var span=newNode("span.tags");
	    var i=0; var lim=tags.length;
	    while (i<lim) {
		span.appendChild(newNode("span.tag",tags[i++]));
		span.appendChild(document.createTextNode(" "));}
	    return span;}

	function linkspan(links){
	    if (!(links)) return false;
	    var span=newNode("span.links");
	    for (url in links) {
		var title=links[url];
		var anchor=newNode("A",title);
		anchor.href=url; anchor.title=url;
		anchor.target='_blank';
		span.appendChild(anchor);
		span.appendChild(document.createTextNode(' '));}
	    return span;}

	function getKnotes(refuri,server){
	    fdjtLog("Getting knotes for %s from %s",refuri,server);
	    var uri=server+"?REFURI="+encodeURIComponent(refuri);
	    var req=new XMLHttpRequest();
	    var ok=req.open('GET',server+"?REFURI="+encodeURIComponent(refuri));
	    req.withCredentials=true;
	    req.onreadystatechange=function(){
		if ((req.readyState === 4) && (req.status>=200) && (req.status<300)) {
		    var knotes=JSON.parse(req.responseText);
		    var i=0; var lim=knotes.length;
		    fdjtLog("Got %d knotes from %s for %s",
			    lim,server,refuri);
		    while (i<lim) addKnote(knotes[i++],server);}};
	    req.send();}
	
	function find_refuri(node){
	    var scan=node;
	    while (scan) {
		if ((scan.getAttributeNS)&&
		    (scan.getAttributeNS("refuri","http://openknotes.org/")))
		    return scan.getAttributeNS("refuri","http://openknotes.org/");
		else node=node.parentNode;}
	    return false;}

	function get_scopeuri(scan){
	    return ((scan.getAttributeNS)&&
		    (scan.getAttributeNS("refuri","http://openknotes.org/")))||
		((scan.getAttribute)&&(scan.getAttribute("data-refuri")))||
		((scan.getAttribute)&&(scan.getAttribute("refuri")));}

	function find_scope(node){
	    var scan=node;
	    while (scan) {
		if ((scan.nodeType===1)&&(get_scopeuri(scan)))
		    return scan;
		else scan=scan.parentNode;}
	    return false;}

	function find_passage(node,prefix,scope){
	    var scan=node;
	    while (scan) {
		if ((scan.id)&&((!(prefix))||(scan.id.search(prefix)===0)))
		    return scan;
		else if (scan===scope) return false;
		else scan=scan.parentNode;}
	    return false;}

	function tagcheckspan(tag){
	    var span=newNode("span.checkspan");
	    var input=newNode('input');
	    input.type='CHECKBOX'; input.name='TAGS';
	    input.value=tag; input.checked=true;
	    var barpos=tag.indexOf('|');
	    var textspan=newNode("span.tag");
	    if (barpos>0) textspan.title=tag;
	    textspan.appendChild(document.createTextNode((barpos>0)?(tag.slice(0,barpos)):(tag)));
	    span.appendChild(input); span.appendChild(input); span.appendChild(textspan);
	    return span;}
	
	function linkcheckspan(link){
	    var input=newNode('input');
	    input.type='CHECKBOX'; input.name='LINKS';
	    input.value=link; input.checked=true;
	    var space=link.indexOf(' ');
	    var href=((space>0)?(link.slice(0,space)):(link));
	    var title=((space>0)?(link.slice(space+1)):(link));
	    var anchor=newNode("A",title);
	    anchor.href=href; if (space>0) anchor.title=href;
	    return newNode("span.checkspan",input,anchor);}

	function knoteDialog(knote){
	    var dialog=fdjtDOM("div.knotepad.knotetext");
	    dialog.innerHTML=OK.knotepad;
	    if (!(knote._stored)) dialog.id='NEWKNOTE4'+knote.frag;
	    var hidden=dialog.getElementsByClassName("hidden")[0];
	    var form_elt=dialog.getElementsByTagName("FORM")[0];
	    var refuri_elt=getInput(dialog,"REFURI");
	    var uuid_elt=getInput(dialog,"UUID");
	    var frag_elt=getInput(dialog,"FRAG");
	    var maker_elt=getInput(dialog,"MAKER");
	    var note_elt=getInput(dialog,"NOTE");
	    form_elt.action=OK.servers[0];
	    uuid_elt.value=knote._id;
	    refuri_elt.value=knote.refuri;
	    frag_elt.value=knote.frag;
	    maker_elt.value=OK.maker;
	    if (knote.note) note_elt.value=knote.note;
	    var altfrags=[];
	    var node=getNode4Knote(knote);
	    if (!(node)) return;
	    var children=node.childNodes;
	    if (children) {
		var i=0; var lim=children.length;
		while (i<lim) {
		    var child=children[i++]; var id=false;
		    if (child.nodeType!==1) continue;
		    else if ((child.tagName==='A')&&(child.name)) {
			if (fdjtDOM.isEmpty(child)) id=child.name;}
		    else if (child.id) {
			if (fdjtDOM.isEmpty(child)) id=child.id;}
		    else {}
		    if (!(id)) continue;
		    var input=fdjtDOM.Input("ALT",id);
		    fdjtDOM(hidden,input);}}
	    if (knote.tags) {
		var tagspans=knote.getElementsByClassName("tags");
		var tags=knote.tags; if (typeof tags === 'string') tags=[tags];
		var i=0; var lim=tags.length;
		while (i<lim) tagspans.appendChild(tagcheckspan(tags[i++]));}
	    if (knote.links) {
		var linkspans=document.getElementsByClassName(knote,"links");
		var links=knote.links;
		if (typeof links === 'string') links=[links];
		var i=0; var lim=tags.length;
		while (i<lim) linkspans.appendChild(linkcheckspan(links[i++]));}
	    var node=document.getElementById(knote.frag);
	    node.insertBefore(dialog,node.firstChild);
	    return dialog;}

	var knotemodes=/(knotetext)|(knotetag)|(knotelink)/;

	var modefocus={"text": "NOTE","tag": "TAG","link": "LINK"};

	function button(evt){
	    evt=evt||event;
	    var target=evt.target||evt.srcElement;
	    var form=getForm(target);
	    if (!(form)) return;
	    var knotepad=form.parentNode;
	    var b=getParent(target,"button");
	    if (!(b)) return;
	    if (!(b.alt)) return;
	    fdjtUI.cancel(evt);
	    if (b.alt==='OK') {
		save_knote(form);
		b=false; form=false; target=false;}
	    else if (b.alt==='close') 
		knotepad.parentNode.removeChild(knotepad);
	    else {
		if (modefocus[b.alt]) {
		    var input=getInput(form,modefocus[b.alt]);
		    if (input)
			setTimeout(function(){input.focus();},100);}
		fdjtDOM.swapClass(knotepad,knotemodes,"knote"+b.alt);}}
	result.button=button;

	function save_knote(target){
	    var form=getForm(target);
	    if (!(form)) return;
	    var knotepad=form.parentNode;
	    fdjtDOM.swapClass(knotepad,knotemodes,"knotesaving");
	    fdjtAjax.formSubmit(
		form,function(req){
		    knotepad.parentNode.removeChild(knotepad);
		    addKnote(JSON.parse(req.responseText));});}

	function note_keypress(evt){
	    evt=evt||event;
	    var kc=evt.charCode;
	    var target=evt.target||evt.sourceElt;
	    if (kc===13) {
		save_knote(target);
		fdjtUI.cancel(evt);
		return false;}}
	result.note_keypress=note_keypress;
	
	function tag_keypress(evt){
	    evt=evt||event;
	    var kc=evt.charCode;
	    var target=evt.target||evt.sourceElt;
	    if (kc===13) {
		var form=getForm(target);
		var tagspans=form.getElementsByClassName("tags")[0];
		var tag=target.value; target.value="";
		fdjtUI.cancel(evt);
		if (tag.length===0) {
		    save_knote(target);
		    return false;}
		tagspans.appendChild(tagcheckspan(tag));
		return false;}}
	result.tag_keypress=tag_keypress;

	function link_keypress(evt){
	    evt=evt||event;
	    var kc=evt.charCode;
	    var target=evt.target||evt.sourceElt;
	    if (kc===13) {
		var form=getForm(target);
		var linkspans=form.getElementsByClassName("links")[0];
		var link=target.value; target.value="";
		fdjtUI.cancel(evt);
		if (link.length===0) {
		    save_knote(target);
		    return;}
		linkspans.appendChild(linkcheckspan(link));
		return false;}}
	result.link_keypress=link_keypress;

	var uiclasses=/(knotepad)|(knote)|(knotes)/;

	var topmost=false;
	var opened=[];

	function add_knote_handler(evt){
	    evt=evt||event;
	    var target=evt.target||evt.fromElt;
	    var scan=target;
	    while (scan) {
		if (scan.nodeType!==1) scan=scan.parentNode;
		else if ((scan.tagName==='A')||(scan.tagName==='INPUT')||
			 (scan.tagName==='TEXTAREA'))
		    return;
		else if ((scan.className)&&
			 (scan.className.search(uiclasses)>=0))
		    return;
		else if (scan.onclick) return;
		else scan=scan.parentNode;}
	    var scope=find_scope(target), prefix=false;
	    var refuri=rooturi;
	    if (scope) {
		var scopeuri=get_scopeuri(scope);
		var hashpos=scopeuri.indexOf('#');
		if (hashpos>0) {
		    prefix=scopeuri.slice(hashpos+1);
		    refuri=scopeuri.slice(0,hashpos);}
		else prefix=false;}
	    else prefix=rootid;
	    var passage=find_passage(target,prefix,scope);
	    if ((!(passage))||(!(passage.id))) return false;
	    var dialog=document.getElementById('NEWKNOTE4'+passage.id);
	    if (!(dialog)) {
		var knote={_id: fdjtState.getUUID(), refuri: refuri,
			   frag: passage.id};
		dialog=knoteDialog(knote);}
	    return dialog;}

	function assign_ids(){
	    var idcounts={};
	    var i=0; var ilim=block_specs.length;
	    while (i<ilim) {
		var nodes=
		    ((document.querySelectorAll)?
		     (document.querySelectorAll(block_specs[i++])):
		     (document.getElementsByTagName(block_specs[i++])));
		var j=0; var jlim=nodes.length;
		while (j<jlim) {
		    var node=nodes[j++];
		    if (node.id) continue;
		    var text=fdjtString.normString(fdjtDOM.textify(node));
		    var idstring="MD5"+fdjtHash.md5(text);
		    var count=idcounts[idstring]||0;
		    if (count) {
			node.id=idstring+"_"+count;
			idcounts[idstring]=count+1;}
		    else {
			node.id=idstring;
			idcounts[idstring]=1;}}}}
	
	return result;
    })();


/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  End: ***
*/
