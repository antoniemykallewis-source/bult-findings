/* The supplied constant-churn recurrence is preserved. Validation and boundary reporting are hardened. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const ids=['price','margin','churn','target','cac-input','current','ramp'];
  const outputs=['o_new','o_ltv','o_ratio','o_max','o_budget','o_months'];
  const usd=n=>'$'+Math.round(n).toLocaleString('en-US');
  const int=n=>Math.round(n).toLocaleString('en-US');
  function calculate(){
    let invalid=false;
    const values=ids.map(id=>{
      const el=$(id),n=el.valueAsNumber;
      const bad=!Number.isFinite(n)||n<Number(el.min)||(el.max!==''&&n>Number(el.max));
      el.setAttribute('aria-invalid',String(bad));
      if(bad)invalid=true;
      return n;
    });
    if(invalid){
      outputs.forEach(id=>{$(id).textContent='-';$(id).classList.remove('warn');});
      $('o_note').textContent='Enter a valid number in every field. Churn must be 0.1–100%; margin 0–100%; all other inputs must be zero or above.';
      return;
    }
    const [p,margin,churn,t,cac,s0,r]=values,m=margin/100,c=churn/100;
    const need=t*c,ltv=p*m/c,ratio=cac>0?ltv/cac:0;
    if(![need,ltv,ratio,need*cac].every(Number.isFinite)){
      outputs.forEach(id=>{$(id).textContent='-';$(id).classList.remove('warn');});
      $('o_note').textContent='These inputs are too large to calculate safely. Please use smaller values.';
      return;
    }
    $('o_new').textContent=int(need);$('o_ltv').textContent=usd(ltv);
    $('o_ratio').textContent=cac>0?ratio.toFixed(1)+' : 1':'n/a';
    $('o_ratio').classList.toggle('warn',cac>0&&ratio<3);
    $('o_max').textContent=usd(ltv/3);$('o_budget').textContent=usd(need*cac);
    let months;
    if(s0>=t)months='Already there';
    else if(c===1&&r>=t)months='1 mo';
    else if(r/c<=t)months='Never at this rate';
    else{let s=s0,i=0;while(s<t&&i<600){s=s*(1-c)+r;i++;}months=s>=t?i+' mo':'>600 mo';}
    $('o_months').textContent=months;
    $('o_months').classList.toggle('warn',months==='Never at this rate');
    $('o_note').textContent=cac>0&&ratio<3?'This ratio is below the example 3:1 goal. Lower ad cost or fewer cancellations would improve it. Check payback and other costs too.':(cac>0?'The ratio meets the example 3:1 goal. ':'CAC is zero, so the ratio is not defined. ')+'Each month: active = active × (1 − churn) + new subs. This does not prove the ad budget is safe.';
  }
  $('calculator-form').addEventListener('input',calculate);
  $('calculator-form').addEventListener('submit',event=>event.preventDefault());
  calculate();
})();
