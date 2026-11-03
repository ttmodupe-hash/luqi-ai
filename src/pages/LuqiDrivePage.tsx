import {useEffect,useMemo,useRef,useState} from "react";
import {Link} from "react-router";
import {Car,Download,ExternalLink,MapPin,Navigation,ShieldCheck,Store,Users,Volume2,WifiOff} from "lucide-react";
import {
  LUQI_DRIVE_REVIEWED_ON,LUQI_DRIVE_ROUTE_PACKS,businessDirectoryLink,cacheDriveRoutePack,
  driveStory,driveStoryMode,geohash6,hasCachedDriveRoutePack,shouldSuppressRepeat,type DriveRouteId
} from "../lib/luqi-drive";
import {
  DRIVE_AREAS_REVIEWED_ON, areasForDriveRoute, canAutoNarrateDriveArea, nearbyDriveArea,
} from "../lib/luqi-drive-areas";

type WakeSentinel={release:()=>Promise<void>;released?:boolean};
type WakeNavigator=Navigator&{wakeLock?:{request:(type:"screen")=>Promise<WakeSentinel>}};

export default function LuqiDrivePage(){
  const [routeId,setRouteId]=useState<DriveRouteId>(LUQI_DRIVE_ROUTE_PACKS[0]!.id);
  const [speedKmh,setSpeedKmh]=useState<number|null>(null);
  const [cell,setCell]=useState("");
  const [tracking,setTracking]=useState(false);
  const [autoAudio,setAutoAudio]=useState(false);
  const [nearbyAreaId,setNearbyAreaId]=useState<string|null>(null);
  const [previewAreaId,setPreviewAreaId]=useState<string>('');
  const autoAudioRef=useRef(false);
  const playedAreaRef=useRef<Record<string,number>>({});
  const lastAutoAtRef=useRef<number|undefined>(undefined);
  const [passengerMode,setPassengerMode]=useState(false);
  const [quizVisible,setQuizVisible]=useState(false);
  const [answer,setAnswer]=useState<number|null>(null);
  const [cached,setCached]=useState(false);
  const [deepOpen,setDeepOpen]=useState(false);
  const [parkedConfirmed,setParkedConfirmed]=useState(false);
  const [message,setMessage]=useState("Location is off. Route packs and source links work without it.");
  const watchRef=useRef<number|null>(null);
  const wakeRef=useRef<WakeSentinel|null>(null);
  const quizTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const recentRef=useRef<Record<string,number>>({});
  const pack=useMemo(()=>LUQI_DRIVE_ROUTE_PACKS.find(item=>item.id===routeId)??LUQI_DRIVE_ROUTE_PACKS[0]!,[routeId]);
  const areas=useMemo(()=>areasForDriveRoute(routeId),[routeId]);
  const nearbyArea=areas.find(item=>item.id===nearbyAreaId)??null;
  const previewArea=areas.find(item=>item.id===previewAreaId)??areas[0]??null;
  const mode=driveStoryMode(speedKmh);
  const story=driveStory(pack,speedKmh);
  const knownMoving=typeof speedKmh==="number"&&speedKmh>=30;
  // A slow-moving car is still a moving car: never unlock driver reading based on low GPS speed alone.
  const deepAllowed=passengerMode||(!knownMoving&&parkedConfirmed);

  useEffect(()=>{
    let active=true;
    void hasCachedDriveRoutePack(pack.id).then(value=>{if(active)setCached(value);}).catch(()=>{if(active)setCached(false);});
    if(quizTimerRef.current!==null){clearTimeout(quizTimerRef.current);quizTimerRef.current=null;}
    setQuizVisible(false);setAnswer(null);setDeepOpen(false);setParkedConfirmed(false);
    setNearbyAreaId(null);setPreviewAreaId(areasForDriveRoute(pack.id)[0]?.id??'');
    autoAudioRef.current=false;setAutoAudio(false);
    return()=>{active=false;};
  },[pack.id]);

  useEffect(()=>()=>{if(watchRef.current!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchRef.current);if(quizTimerRef.current!==null){clearTimeout(quizTimerRef.current);quizTimerRef.current=null;}void wakeRef.current?.release();if("speechSynthesis"in window)window.speechSynthesis.cancel();},[]);

  useEffect(()=>{
    const onHidden=()=>{if(document.hidden){if(quizTimerRef.current!==null){clearTimeout(quizTimerRef.current);quizTimerRef.current=null;}setQuizVisible(false);setAnswer(null);autoAudioRef.current=false;setAutoAudio(false);if("speechSynthesis"in window)window.speechSynthesis.cancel();void wakeRef.current?.release();wakeRef.current=null;}};
    document.addEventListener("visibilitychange",onHidden);
    return()=>document.removeEventListener("visibilitychange",onHidden);
  },[]);

  useEffect(()=>{
    if(knownMoving)setParkedConfirmed(false);
    if(!deepAllowed)setDeepOpen(false);
  },[knownMoving,deepAllowed]);

  function stopLocation(){
    if(watchRef.current!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current=null;setTracking(false);setSpeedKmh(null);setCell("");
    setNearbyAreaId(null);setAutoAudio(false);autoAudioRef.current=false;
    if("speechSynthesis"in window)window.speechSynthesis.cancel();
    setMessage("Location assist stopped, automatic audio off. No coordinates were saved by Luqi-Drive.");
  }

  function chooseRoute(next:DriveRouteId){
    stopLocation();
    setRouteId(next);
    setPreviewAreaId(areasForDriveRoute(next)[0]?.id??'');
  }

  function toggleAutoAudio(enabled:boolean){
    if(enabled&&(!("speechSynthesis"in window)||typeof SpeechSynthesisUtterance==="undefined")){
      setMessage("Automatic narration is not supported in this browser. Public stories remain readable when safely parked.");
      return;
    }
    autoAudioRef.current=enabled;setAutoAudio(enabled);
    if(!enabled&&"speechSynthesis"in window)window.speechSynthesis.cancel();
    setMessage(enabled
      ?"Opt-in narration is enabled for this visible tab. With location permission, a reviewed nearby story may play once; phone/car audio routing is managed by your device."
      :"Automatic narration is off.");
  }

  function startLocation(){
    if(!navigator.geolocation){setMessage("This browser does not provide geolocation. Route packs still work without it.");return;}
    if(watchRef.current!==null)return;
    setMessage("Requesting browser location permission…");
    watchRef.current=navigator.geolocation.watchPosition(position=>{
      const raw=position.coords.speed;
      setSpeedKmh(typeof raw==="number"&&Number.isFinite(raw)&&raw>=0?Math.round(raw*3.6):null);
      try{setCell(geohash6(position.coords.latitude,position.coords.longitude));}catch{setCell("");}
      setTracking(true);
      const near=nearbyDriveArea({
        routeId,latitude:position.coords.latitude,longitude:position.coords.longitude,
        accuracyMeters:position.coords.accuracy,timestamp:position.timestamp,
      });
      setNearbyAreaId(near?.id??null);
      // No passive autoplay: requires both explicit location and opt-in audio.
      // Never guess the road or fetch an AI story; only speak vetted local text.
      const now=Date.now();
      if(near&&autoAudioRef.current&&!document.hidden&&
        "speechSynthesis"in window&&typeof SpeechSynthesisUtterance!=="undefined"&&
        !window.speechSynthesis.speaking&&
        canAutoNarrateDriveArea(playedAreaRef.current[near.id],lastAutoAtRef.current,now)){
        try{
          const utterance=new SpeechSynthesisUtterance(near.audioBrief);
          utterance.rate=.94;utterance.pitch=1;
          utterance.onerror=()=>setMessage("This device could not complete the narration. Luqi will not retry it automatically.");
          window.speechSynthesis.speak(utterance);
          playedAreaRef.current[near.id]=now;lastAutoAtRef.current=now;
          setMessage("Requested an audio briefing near "+near.title+". Playback through the vehicle depends on phone pairing and OS audio routing.");
        }catch{setMessage("Automatic audio was unavailable. Continue with the public story when safely parked.");}
      }else if(!near){
        setMessage("Location is on. No verified story marker is nearby, or this GPS fix is too inaccurate. No coordinates were uploaded.");
      }
    },error=>{
      watchRef.current=null;setTracking(false);setSpeedKmh(null);setCell("");setNearbyAreaId(null);
      autoAudioRef.current=false;setAutoAudio(false);
      setMessage(error.code===1?"Location permission was not granted. Route packs still work without it.":"Location could not be confirmed. Route packs still work without it.");
    },{enableHighAccuracy:false,maximumAge:15000,timeout:10000});
  }

  async function saveOffline(){
    try{await cacheDriveRoutePack(pack);setCached(true);setMessage("Public route pack saved in this browser. Full offline opening still depends on the app/browser cache, and some device voices may need network access.");}
    catch{setMessage("This browser could not save the route pack to IndexedDB. You can still use it while online.");}
  }

  async function keepAwake(){
    const nav=navigator as WakeNavigator;
    if(!nav.wakeLock?.request){setMessage("Screen Wake Lock is not supported by this browser. Use your device's normal display settings safely.");return;}
    try{wakeRef.current=await nav.wakeLock.request("screen");setMessage("Screen wake lock is active for this visible page. It is released when the page is hidden or closed.");}
    catch{setMessage("The browser did not grant a screen wake lock. Luqi-Drive continues without it.");}
  }

  function speak(text:string,force=false){
    if(!("speechSynthesis"in window)||typeof SpeechSynthesisUtterance==="undefined"){setMessage("On-device speech is unavailable in this browser. Read the briefing on screen instead.");return;}
    const key=pack.id+":"+(cell||"no-location");
    if(!force&&shouldSuppressRepeat(recentRef.current[key])){setMessage("This briefing played recently in the same local cell. Use Replay if a passenger wants to hear it again.");return;}
    recentRef.current[key]=Date.now();
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.rate=1;utterance.pitch=1;
    window.speechSynthesis.speak(utterance);
    setMessage(mode==="brief"?"Highway briefing playing. Keep your attention on the road.":"Briefing playing on this device.");
    if(passengerMode){
      if(quizTimerRef.current)clearTimeout(quizTimerRef.current);
      setQuizVisible(false);setAnswer(null);
      quizTimerRef.current=setTimeout(()=>{quizTimerRef.current=null;setQuizVisible(true);},120000);
    }
  }

  return <main className="mx-auto max-w-6xl min-w-0 space-y-6 px-3 py-7 text-slate-100 sm:px-6" aria-labelledby="drive-heading">
    <header className="space-y-4 rounded-2xl border border-slate-600 bg-slate-900 p-5 sm:p-7">
      <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-300"><Car size={18} aria-hidden="true"/> Luqi-Drive · Tool 020</p>
      <h1 id="drive-heading" className="text-3xl font-bold sm:text-4xl">Source-linked road stories without turning the phone into a distraction.</h1>
      <p className="max-w-4xl text-slate-200">Choose a reviewed South African corridor, save the public route pack, listen to a speed-adaptive briefing and discover reviewed local businesses. Luqi-Drive does not provide turn-by-turn navigation, emergency alerts or background tracking.</p>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-slate-500 px-3 py-2">No account required</span>
        <span className="rounded-full border border-slate-500 px-3 py-2">No coordinates uploaded</span>
        <span className="rounded-full border border-slate-500 px-3 py-2">Public route packs only in IndexedDB</span>
        <span className="rounded-full border border-slate-500 px-3 py-2">Sources reviewed {LUQI_DRIVE_REVIEWED_ON}</span>
      </div>
      <p className="text-sm text-amber-100"><ShieldCheck size={16} className="mr-1 inline" aria-hidden="true"/> Drivers should not operate the screen while moving. Passenger mode is for a passenger; otherwise park safely before interacting.</p>
    </header>

    <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]" aria-label="Choose route and device mode">
      <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">1 · Choose a route pack</h2>
        <label className="block text-sm font-medium">Reviewed corridor
          <select aria-label="Luqi-Drive route" value={routeId} onChange={e=>chooseRoute(e.target.value as DriveRouteId)} className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-white">
            {LUQI_DRIVE_ROUTE_PACKS.map(item=><option key={item.id} value={item.id}>{item.title} · {item.corridor}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={()=>void saveOffline()} className="min-h-11 rounded-lg bg-cyan-700 px-4 py-3 font-semibold text-white"><Download size={17} className="mr-2 inline" aria-hidden="true"/>{cached?"Route pack saved":"Download route pack"}</button>
          <button type="button" onClick={()=>void keepAwake()} className="min-h-11 rounded-lg border border-cyan-500 px-4 py-3 text-cyan-100">Keep screen awake</button>
        </div>
        <p className="text-xs text-slate-300"><WifiOff size={15} className="mr-1 inline" aria-hidden="true"/> Saved packs contain Luqi's public text and source links only. They do not cache third-party maps, articles, audio or private account data.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">2 · Optional driving context</h2>
        <div className="flex flex-wrap gap-3">
          {!tracking?<button type="button" onClick={startLocation} className="min-h-11 rounded-lg border border-cyan-500 px-4 py-3 text-cyan-100"><Navigation size={17} className="mr-2 inline" aria-hidden="true"/>Start location assist</button>:<button type="button" onClick={stopLocation} className="min-h-11 rounded-lg border border-amber-500 px-4 py-3 text-amber-100">Stop location assist</button>}
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-950 p-3"><dt className="text-slate-400">Speed context</dt><dd className="font-semibold">{speedKmh===null?"Not available":speedKmh+" km/h"}</dd></div>
          <div className="rounded-lg bg-slate-950 p-3"><dt className="text-slate-400">Privacy cell</dt><dd className="font-mono">{cell||"Not calculated"}</dd></div>
        </dl>
        <div className="space-y-2">
          <label className="flex min-h-11 items-start gap-3 rounded-lg border border-cyan-600 p-3">
            <input className="mt-1" type="checkbox" checked={autoAudio} onChange={e=>toggleAutoAudio(e.target.checked)}/>
            <span><strong>Enable automatic nearby audio stories</strong><br/><span className="text-xs text-slate-300">
              Optional, foreground-only and off by default. Requires separate location permission. No AI calls, no private GPS upload, no automatic repeat. Bluetooth media audio may work after pairing the phone; dashboard display is not enabled by Bluetooth alone.
            </span></span>
          </label>
          <label className="flex min-h-11 items-start gap-3 rounded-lg border border-slate-600 p-3"><input className="mt-1" type="checkbox" checked={passengerMode} onChange={e=>{if(quizTimerRef.current!==null){clearTimeout(quizTimerRef.current);quizTimerRef.current=null;}setPassengerMode(e.target.checked);setQuizVisible(false);setAnswer(null);}}/><span><strong>Passenger & family quiz mode</strong><br/><span className="text-xs text-slate-300">A passenger may use deeper content while moving. After a passenger-triggered briefing, one silent quiz appears after two minutes.</span></span></label><label className="flex min-h-11 items-start gap-3 rounded-lg border border-slate-600 p-3"><input className="mt-1" type="checkbox" checked={parkedConfirmed} onChange={e=>{setParkedConfirmed(e.target.checked&&!knownMoving);if(!e.target.checked)setDeepOpen(false);}}/><span><strong>I am safely parked</strong><br/><span className="text-xs text-slate-300">Use this only when the vehicle is stationary. Luqi cannot independently verify parking when device speed is unavailable.</span></span></label></div>
      </div>
    </section>

    <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5" aria-labelledby="briefing-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-medium text-cyan-300">3 · Listen & learn</p><h2 id="briefing-heading" className="text-2xl font-bold">{pack.title}</h2><p className="text-sm text-slate-300">{pack.corridor}</p></div>
        <span className="rounded-full border border-slate-500 px-3 py-2 text-xs">Mode: {mode==="brief"?"35-second style":mode==="deep"?"slow/parked deep dive":"standard"}</span>
      </div>
      <p className="leading-relaxed text-slate-100">{story}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={()=>speak(story)} className="min-h-11 rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white"><Volume2 size={17} className="mr-2 inline" aria-hidden="true"/>Play briefing</button>
        <button type="button" onClick={()=>speak(story,true)} className="min-h-11 rounded-lg border border-slate-500 px-4 py-3 text-slate-100">Replay</button>
        <button type="button" disabled={!deepAllowed} onClick={()=>setDeepOpen(v=>!v)} className="min-h-11 rounded-lg border border-cyan-500 px-4 py-3 text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">{deepOpen?"Close deep dive":"Open 3-minute-style deep dive"}</button>
      </div>
      {!deepAllowed&&<p className="text-xs text-amber-100">Deep-dive controls stay disabled unless speed is confirmed below 30 km/h, a passenger is operating the device, or you explicitly confirm the vehicle is safely parked.</p>}
      {deepOpen&&deepAllowed&&<div className="rounded-xl border border-cyan-800 bg-slate-950 p-4"><p>{pack.deep}</p></div>}
    </section>

    <section className="space-y-4 rounded-2xl border border-cyan-700 bg-slate-900 p-5" aria-labelledby="drive-areas-heading">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">4 · Local discovery · reviewed {DRIVE_AREAS_REVIEWED_ON}</p>
      <h2 id="drive-areas-heading" className="text-2xl font-bold">Did you know what is around you?</h2>
      <p className="text-sm text-slate-200">Travel stories cover geography, ancient and modern history, natural wealth, living cultures, fauna and flora. Locations are approximate editorial zones, not turn-by-turn navigation or proof an attraction is on the highway. Only the two reviewed routes currently have these area stories.</p>
      <p role="status" aria-live="polite" className="rounded-lg bg-slate-950 p-3 text-sm text-cyan-100">
        {nearbyArea?'Near a reviewed area: '+nearbyArea.title:'No nearby area confirmed. Select a reviewed location to preview when parked or as a passenger.'}
      </p>
      <label className="block space-y-1 text-sm">
        <span className="font-semibold">Explore a reviewed area (passenger or parked only)</span>
        <select aria-label="Luqi-Drive area preview" value={previewArea?.id??''}
          disabled={!deepAllowed}
          onChange={e=>setPreviewAreaId(e.target.value)}
          className="w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-white disabled:opacity-50">
          {areas.map(area=><option value={area.id} key={area.id}>{area.title}</option>)}
        </select>
      </label>
      {!deepAllowed?<p className="text-sm text-amber-100">Detailed place descriptions, original-source links and passenger exploration are available only after you confirm that the vehicle is safely parked or a passenger is using the device. Speed alone cannot confirm safe parking.</p>:
        previewArea&&<div className="space-y-4">
          <h3 className="text-xl font-semibold">{previewArea.title}</h3>
          <p className="text-sm text-slate-300">{previewArea.vicinity}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {previewArea.topics.map(topic=><article key={topic.category} className="space-y-2 rounded-lg border border-slate-700 bg-slate-950 p-3">
              <h4 className="font-semibold text-cyan-200">{topic.category}</h4>
              <p className="text-sm leading-relaxed">{topic.fact}</p>
              <a href={previewArea.sources[topic.source]?.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-200 underline">Original source: {previewArea.sources[topic.source]?.label}</a>
            </article>)}
          </div>
        </div>}
      <p className="text-xs text-slate-400">Any recorded animal or plant is described as regional habitat, not a promised sighting. Do not approach wildlife or leave the road for an unverified stop.</p>
    </section>

    <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5" aria-labelledby="drive-car-audio">
      <h2 id="drive-car-audio" className="text-xl font-semibold">Vehicle audio and screen compatibility</h2>
      <p className="text-sm">Luqi's spoken stories can use the phone's normal media output. A vehicle's Bluetooth media connection may play the sound if paired and supported. Browser speech availability, background playback and audio focus differ by device.</p>
      <p className="text-sm">Bluetooth pairing alone does not project Luqi to a dashboard display. Native Android Auto, Android Automotive OS and Apple CarPlay require supported app categories, approved templates, distribution and in-vehicle certification/testing. The current Luqi-Drive web page is not a certified dashboard app.</p>
      <p className="text-sm text-amber-100">Driver mode remains audio-first, with no moving-vehicle quizzes, video or lengthy on-screen reading. Park before pairing Bluetooth, changing routes or using detailed cards.</p>
      <div className="flex flex-wrap gap-4 text-sm">
        <a href="https://developer.android.com/training/cars/apps/library" target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline">Android for Cars requirements</a>
        <a href="https://developer.apple.com/carplay/" target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline">Apple CarPlay requirements</a>
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <article className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <p className="text-sm font-medium text-cyan-300">Resource learning card</p>
        <h2 className="text-xl font-semibold">{pack.resourceTitle}</h2>
        <p className="text-sm leading-relaxed text-slate-200">{pack.resourceSummary}</p>
        <p className="text-xs text-amber-100">Educational context only. Luqi-Drive does not infer mineral ownership, reserves, mine locations or investment value from your GPS position.</p>
      </article>
      <article className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <p className="text-sm font-medium text-cyan-300"><Store size={16} className="mr-1 inline" aria-hidden="true"/> Support local along this corridor</p>
        <h2 className="text-xl font-semibold">Reviewed Luqi Business Connect profiles</h2>
        <p className="text-sm text-slate-200">Search published owner profiles in the destination province. Luqi does not invent ratings, claim a business is open, or expose a private home coordinate.</p>
        <Link to={businessDirectoryLink(pack)} className="inline-flex min-h-11 items-center rounded-lg border border-cyan-500 px-4 py-3 font-semibold text-cyan-100">Find local businesses <ExternalLink size={16} className="ml-2" aria-hidden="true"/></Link>
        <Link to="/business-connect" className="block text-sm text-cyan-200 underline">Register my business for review</Link>
      </article>
    </section>

    {passengerMode&&<section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5" aria-label="Passenger quiz">
      <p className="text-sm font-medium text-cyan-300"><Users size={16} className="mr-1 inline" aria-hidden="true"/> Passenger & kids quiz</p>
      {!quizVisible?<p className="text-sm text-slate-300">Play a briefing to start the two-minute quiz timer. The quiz stays silent until a passenger chooses to interact.</p>:<>
        <h2 className="text-xl font-semibold">{pack.quiz.question}</h2>
        <div className="grid gap-2">{pack.quiz.options.map((option,index)=><button key={option} type="button" onClick={()=>setAnswer(index)} className="min-h-11 rounded-lg border border-slate-600 bg-slate-950 p-3 text-left hover:border-cyan-500">{option}</button>)}</div>
        {answer!==null&&<p role="status" className={answer===pack.quiz.answerIndex?"text-emerald-300":"text-amber-200"}>{answer===pack.quiz.answerIndex?"Correct. ":"Not quite. "}{pack.quiz.explanation}</p>}
      </>}
    </section>}

    <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5" aria-labelledby="drive-sources">
      <p className="text-sm font-medium text-cyan-300">5 · Verify</p>
      <h2 id="drive-sources" className="text-xl font-semibold">Original sources</h2>
      <p className="text-sm text-slate-300">Route packs are reviewed summaries, not live traffic, opening-hour or safety feeds. Open the original publisher before making a time-sensitive stop.</p>
      <ul className="space-y-2">{pack.sources.map(source=><li key={source.url} className="rounded-lg border border-slate-700 bg-slate-950 p-3"><a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-cyan-200 underline">{source.label}<ExternalLink size={15} className="ml-1 inline" aria-hidden="true"/></a><p className="mt-1 text-xs text-slate-400">{source.note}</p></li>)}</ul>
    </section>

    <p role="status" aria-live="polite" className="rounded-lg bg-slate-950 p-3 text-sm text-cyan-100"><MapPin size={15} className="mr-1 inline" aria-hidden="true"/>{message}</p>
  </main>;
}
