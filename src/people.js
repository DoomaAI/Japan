// Who is in the plan, and as what. The family app knew four names and two roles from a constant;
// a plan anyone can join by link keeps a record per person on the plan itself, and every check
// of "is this a member" or "may this person do that" reads the record, never a name. Shared by
// the phone and the server, so it has no dependencies and throws nothing: a problem comes back
// as a sentence for the server to refuse with.
//
// The two roles keep the names the app has used since day one, parent and child, because the
// permission they carry is the same on a dinner as on the trip: a parent edits everything and
// sees the money, a child takes part in their own things. What changes is what they are called
// on screen, which follows the kind of plan (roleLabel below). A wedding's organiser is a parent
// to the server and an Organiser to the couple.
import {planOf} from './plan-context.js';
export const MEMBER_ROLES=['parent','child'];
// Only to upgrade a plan saved before people had records: the family's two parents. Nothing
// else reads these names.
const LEGACY_PARENTS=['Damien','Lauren'];
export const ROLE_LABELS={
 trip:{parent:'Parent editor',child:'Family member'},
 other:{parent:'Organiser',child:'Guest'}
};
export const roleLabel=(planOrState,role)=>(planOf(planOrState?.days?planOrState:{plan:planOrState}).type==='trip'?ROLE_LABELS.trip:ROLE_LABELS.other)[role]||role;
export const ROLE_NOTES={parent:'Can edit everything, see every ticket and the money, and invite others',child:'Can take part: tick things off, add photos, vote and answer for themselves'};
// The record for everyone on the members list, filled in for anyone who has none, and dropped for
// anyone no longer on the list. A record with a role the app does not know is given the safer one.
export function peopleOf(state){
 const members=state?.members||[],given=state?.people||{},people={};
 for(const name of members){
  const p=given[name]||{};
  people[name]={household:'',joinedAt:null,via:'seed',...p,role:MEMBER_ROLES.includes(p.role)?p.role:(LEGACY_PARENTS.includes(name)&&!p.role?'parent':'child')};
 }
 return people;
}
export const roleOf=(state,name)=>peopleOf(state)[name]?.role||null;
export const isParent=(state,name)=>roleOf(state,name)==='parent';
export const parentsOf=state=>(state?.members||[]).filter(n=>roleOf(state,n)==='parent');
export const householdOf=(state,name)=>peopleOf(state)[name]?.household||'';
// A name as it will be shown and typed by everyone else: two to forty characters, letters first,
// spaces and the usual punctuation, not the word the app uses for everybody at once, and not a
// name already on the list in any case.
export const cleanName=raw=>String(raw??'').trim().replace(/\s+/g,' ');
export function nameProblem(name,state=null){
 if(typeof name!=='string'||name.length<2||name.length>40)return 'Use a name of two to forty characters.';
 if(!/^[\p{L}\p{M}][\p{L}\p{M}\p{N} .'’-]*$/u.test(name))return 'Use letters, spaces and the usual punctuation in a name.';
 if(/^(family|everyone|all)$/i.test(name))return 'That word is used for everybody at once. Use your own name.';
 if(state&&(state.members||[]).some(n=>n.toLowerCase()===name.toLowerCase()))return 'Someone with that name is already in the plan. Add an initial, or ask for your own link.';
 return null;
}
export const householdProblem=h=>h===undefined||h===''||(typeof h==='string'&&h.length<=80&&h.trim()===h)?null:'Keep a household name under 80 characters.';
// Adding a person to the plan, whether they joined by an open link or a parent typed them in.
// Mutates the state it is given and returns a problem sentence, or null once they are in.
export function joinMember(state,{name,role,household='',via='link',now}){
 const problem=nameProblem(name,state)||householdProblem(household)||(MEMBER_ROLES.includes(role)?null:'Choose a role from the list.');
 if(problem)return problem;
 state.members=[...(state.members||[]),name];
 state.people={...peopleOf(state),[name]:{role,household:household||'',joinedAt:now||new Date().toISOString(),via}};
 return null;
}
// Changing what someone is. The last parent stays a parent: a plan with nobody who can edit it is
// a plan nobody can fix.
export function changeRole(state,{name,role}){
 if(!(state.members||[]).includes(name))return 'That person is not in the plan.';
 if(!MEMBER_ROLES.includes(role))return 'Choose a role from the list.';
 if(role!=='parent'&&parentsOf(state).length===1&&parentsOf(state)[0]===name)return 'Keep at least one organiser. Make somebody else one first.';
 state.people={...peopleOf(state),[name]:{...peopleOf(state)[name],role}};
 return null;
}
export function changeHousehold(state,{name,household}){
 if(!(state.members||[]).includes(name))return 'That person is not in the plan.';
 const problem=householdProblem(household);if(problem)return problem;
 state.people={...peopleOf(state),[name]:{...peopleOf(state)[name],household:household||''}};
 return null;
}
