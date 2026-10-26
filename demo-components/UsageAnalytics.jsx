"use client";
import {useEffect} from "react";
import {usageConfig} from "./analytics/config.mjs";
export default function UsageAnalytics() {
 useEffect(()=>{if(!usageConfig.hosts.includes(location.hostname)||document.getElementById('service-usage-loader'))return;const script=document.createElement('script');script.id='service-usage-loader';script.type='module';script.src='/usage-analytics.js';script.dataset.usageConfig=JSON.stringify(usageConfig);document.head.append(script);},[]);
 return null;
}
