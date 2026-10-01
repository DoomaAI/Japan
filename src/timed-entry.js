// Timed entry at the two Disney parks. A DPA return time and a Vacation Package ride time both
// let us in at any point in the hour from the time shown, so each of those stops carries a
// 60-minute entry window: on time until it closes, and the late-day planner leaves it be until
// then. Restaurant bookings stay exact. Baymax and Splash Mountain have no time at all.
//
// Applied once to the live trip, and only to a stop whose window nobody has set yet.
export const WINDOW_SEED=1;
export const DISNEY_WINDOWS={
 '2026-09-30-05':60,'2026-09-30-08':60,'2026-09-30-11':60,'2026-09-30-12':60,'2026-09-30-15':60,
 '2026-10-01-04':60,'2026-10-01-05':60,'2026-10-01-06':60,'2026-10-01-12':60,'2026-10-01-13':60,
};
export function windowsSeeded(state){
 if((state.windowSeed||0)>=WINDOW_SEED)return state;
 const steps=(state.steps||[]).map(s=>DISNEY_WINDOWS[s.id]&&s.windowMinutes==null?{...s,windowMinutes:DISNEY_WINDOWS[s.id]}:s);
 return {...state,steps,windowSeed:WINDOW_SEED};
}
