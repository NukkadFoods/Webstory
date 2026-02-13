import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { getTopStories } from '../services/storyService';
import { searchArticles } from '../services/articleService';

// Browser-friendly database interaction wrapper (currently unused)
// eslint-disable-next-line no-unused-vars
const useBrowserDB = () => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  const saveToStorage = (key, data) => {
    if (isBrowser) {
      try {
        sessionStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('Error saving to session storage:', e);
        return false;
      }
    }
    return false;
  };
  
  const getFromStorage = (key) => {
    if (isBrowser) {
      try {
        const data = sessionStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        console.error('Error reading from session storage:', e);
        return null;
      }
    }
    return null;
  };
  
  // This function simulates a database operation but works in the browser
  const saveTrendingTopics = async (topics) => {
    return saveToStorage('trending_topics_cache', topics);
  };
  
  const getTrendingTopics = () => {
    return getFromStorage('trending_topics_cache');
  };
  
  return {
    saveTrendingTopics,
    getTrendingTopics
  };
};

const TrendingTopics = () => {
  const [availableTopics, setAvailableTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTime, setRefreshTime] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Base trending topics that will be validated dynamically
  const baseTrendingTopics = [
    // Politics related topics
    { id: 1, name: 'Election 2025', path: '/search?q=election%202025', category: 'politics', searchTerm: 'election 2025', requireValidation: true },
    { id: 2, name: 'White House', path: '/search?q=white%20house', category: 'politics', searchTerm: 'white house' },
    { id: 3, name: 'Congress', path: '/search?q=congress', category: 'politics', searchTerm: 'congress' },
    { id: 4, name: 'Supreme Court', path: '/search?q=supreme%20court', category: 'politics', searchTerm: 'supreme court' },
    
    // Business and trading related topics
    { id: 5, name: 'Stock Market', path: '/search?q=stock%20market', category: 'business', searchTerm: 'stock market' },
    { id: 6, name: 'Cryptocurrency', path: '/search?q=cryptocurrency', category: 'business', searchTerm: 'cryptocurrency' },
    { id: 7, name: 'Wall Street', path: '/search?q=wall%20street', category: 'business', searchTerm: 'wall street' },
    { id: 8, name: 'Federal Reserve', path: '/search?q=federal%20reserve', category: 'business', searchTerm: 'federal reserve' },
    { id: 9, name: 'Trading', path: '/search?q=trading', category: 'business', searchTerm: 'trading' },
    
    // Technology topics
    { id: 10, name: 'AI', path: '/search?q=artificial%20intelligence', category: 'technology', searchTerm: 'artificial intelligence' },
    { id: 11, name: 'Big Tech', path: '/category/technology', category: 'technology' },
    
    // Other categories
    { id: 12, name: 'Climate Change', path: '/search?q=climate%20change', category: 'science', searchTerm: 'climate change' },
    { id: 13, name: 'Healthcare', path: '/search?q=healthcare', category: 'health', searchTerm: 'healthcare' },
    { id: 14, name: 'Sports', path: '/category/sports', category: 'sports' },
    { id: 15, name: 'Real Estate', path: '/category/realestate', category: 'realestate' },
    { id: 16, name: 'Travel', path: '/category/travel', category: 'travel' },
    { id: 17, name: 'Food', path: '/category/food', category: 'food' },
    { id: 18, name: 'World News', path: '/category/world', category: 'world' },
    { id: 19, name: 'Opinion', path: '/category/opinion', category: 'opinion' },
    { id: 20, name: 'Fashion', path: '/category/fashion', category: 'fashion' }
  ];
  
    // Function to identify trending topics based on article data
  const identifyTrendingTopics = useCallback(async () => {
    // Extract keywords from top stories to discover trending terms
    const cachedTopStories = JSON.parse(sessionStorage.getItem('topStories') || '[]');
    const keywordFrequency = {};
    const dateKeywords = new Set(['2024', '2025', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']);
    
    // Common English stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'throughout', 'despite', 'towards', 'upon', 'concerning', 'over', 'under', 'within', 'without', 'alongside', 'beneath', 'beyond', 'across', 'around', 'near', 'far', 'away', 'off', 'down', 'out', 'inside', 'outside', 'behind', 'ahead', 'beside', 'besides', 'except', 'against', 'through', 'throughout', 'until', 'unless', 'since', 'while', 'because', 'although', 'however', 'therefore', 'moreover', 'furthermore', 'nevertheless', 'otherwise', 'meanwhile', 'consequently', 'subsequently', 'accordingly', 'hence', 'thus', 'instead', 'rather', 'indeed', 'certainly', 'obviously', 'clearly', 'definitely', 'probably', 'possibly', 'perhaps', 'maybe', 'likely', 'unlikely', 'surely', 'truly', 'really', 'actually', 'basically', 'generally', 'usually', 'often', 'sometimes', 'always', 'never', 'rarely', 'frequently', 'occasionally', 'constantly', 'continuously', 'regularly', 'normally', 'typically', 'commonly', 'widely', 'particularly', 'especially', 'specifically', 'mainly', 'mostly', 'largely', 'primarily', 'chiefly', 'principally', 'fundamentally', 'essentially', 'basically', 'primarily', 'secondarily', 'initially', 'finally', 'lastly', 'firstly', 'secondly', 'thirdly', 'additionally', 'also', 'too', 'as', 'well', 'plus', 'along', 'together', 'similarly', 'likewise', 'comparatively', 'relatively', 'absolutely', 'completely', 'entirely', 'totally', 'wholly', 'fully', 'quite', 'very', 'extremely', 'highly', 'deeply', 'greatly', 'significantly', 'considerably', 'substantially', 'notably', 'remarkably', 'particularly', 'unusually', 'exceptionally', 'surprisingly', 'interestingly', 'importantly', 'fortunately', 'unfortunately', 'hopefully', 'thankfully', 'regrettably', 'sadly', 'happily', 'luckily', 'unluckily', 'ironically', 'surprisingly', 'naturally', 'obviously', 'clearly', 'evidently', 'apparently', 'seemingly', 'presumably', 'supposedly', 'allegedly', 'reportedly', 'theoretically', 'practically', 'realistically', 'ideally', 'preferably', 'ultimately', 'eventually', 'gradually', 'immediately', 'instantly', 'suddenly', 'quickly', 'slowly', 'rapidly', 'gradually', 'steadily', 'consistently', 'persistently', 'repeatedly', 'frequently', 'regularly', 'occasionally', 'rarely', 'hardly', 'barely', 'nearly', 'almost', 'quite', 'fairly', 'rather', 'somewhat', 'slightly', 'moderately', 'considerably', 'significantly', 'substantially', 'tremendously', 'enormously', 'immensely', 'vastly', 'hugely', 'massively', 'extensively', 'widely', 'broadly', 'generally', 'universally', 'globally', 'internationally', 'nationally', 'locally', 'regionally', 'personally', 'individually', 'collectively', 'jointly', 'mutually', 'reciprocally', 'alternatively', 'exclusively', 'inclusively', 'comprehensively', 'thoroughly', 'carefully', 'cautiously', 'deliberately', 'intentionally', 'accidentally', 'coincidentally', 'unfortunately', 'fortunately', 'surprisingly', 'predictably', 'unexpectedly', 'inevitably', 'necessarily', 'voluntarily', 'involuntarily', 'consciously', 'unconsciously', 'automatically', 'manually', 'mechanically', 'electronically', 'digitally', 'technologically', 'scientifically', 'mathematically', 'logically', 'rationally', 'emotionally', 'psychologically', 'physically', 'mentally', 'spiritually', 'culturally', 'socially', 'politically', 'economically', 'financially', 'commercially', 'industrially', 'agriculturally', 'environmentally', 'ecologically', 'biologically', 'chemically', 'medically', 'legally', 'ethically', 'morally', 'philosophically', 'historically', 'geographically', 'demographically', 'statistically', 'analytically', 'systematically', 'methodically', 'strategically', 'tactically', 'practically', 'theoretically', 'hypothetically', 'experimentally', 'empirically', 'observationally', 'qualitatively', 'quantitatively', 'objectively', 'subjectively', 'relatively', 'absolutely', 'positively', 'negatively', 'optimistically', 'pessimistically', 'realistically', 'idealistically', 'pragmatically', 'dogmatically', 'flexibly', 'rigidly', 'strictly', 'loosely', 'broadly', 'narrowly', 'deeply', 'superficially', 'thoroughly', 'briefly', 'extensively', 'intensively', 'comprehensively', 'partially', 'completely', 'entirely', 'totally', 'fully', 'half', 'quarter', 'third', 'whole', 'part', 'piece', 'section', 'portion', 'segment', 'fragment', 'element', 'component', 'aspect', 'feature', 'characteristic', 'quality', 'property', 'attribute', 'trait', 'detail', 'factor', 'point', 'issue', 'matter', 'subject', 'topic', 'theme', 'concept', 'idea', 'notion', 'thought', 'opinion', 'view', 'perspective', 'approach', 'method', 'way', 'means', 'manner', 'style', 'technique', 'strategy', 'plan', 'scheme', 'system', 'process', 'procedure', 'practice', 'habit', 'custom', 'tradition', 'convention', 'rule', 'regulation', 'law', 'principle', 'standard', 'norm', 'criterion', 'measure', 'scale', 'level', 'degree', 'extent', 'amount', 'quantity', 'number', 'figure', 'statistic', 'data', 'information', 'knowledge', 'understanding', 'awareness', 'consciousness', 'recognition', 'realization', 'perception', 'observation', 'insight', 'discovery', 'finding', 'result', 'outcome', 'consequence', 'effect', 'impact', 'influence', 'change', 'difference', 'variation', 'modification', 'adjustment', 'improvement', 'enhancement', 'development', 'progress', 'advancement', 'growth', 'expansion', 'increase', 'decrease', 'reduction', 'decline', 'fall', 'rise', 'gain', 'loss', 'benefit', 'advantage', 'disadvantage', 'strength', 'weakness', 'opportunity', 'threat', 'risk', 'danger', 'safety', 'security', 'protection', 'defense', 'attack', 'offense', 'support', 'assistance', 'help', 'aid', 'service', 'favor', 'kindness', 'generosity', 'charity', 'donation', 'gift', 'present', 'reward', 'prize', 'award', 'recognition', 'appreciation', 'gratitude', 'thanks', 'acknowledgment', 'credit', 'blame', 'responsibility', 'accountability', 'liability', 'obligation', 'duty', 'commitment', 'promise', 'agreement', 'contract', 'deal', 'arrangement', 'settlement', 'resolution', 'solution', 'answer', 'response', 'reply', 'reaction', 'feedback', 'comment', 'remark', 'statement', 'declaration', 'announcement', 'proclamation', 'speech', 'address', 'presentation', 'lecture', 'talk', 'discussion', 'conversation', 'dialogue', 'debate', 'argument', 'dispute', 'conflict', 'disagreement', 'controversy', 'problem', 'difficulty', 'challenge', 'obstacle', 'barrier', 'hindrance', 'impediment', 'limitation', 'restriction', 'constraint', 'boundary', 'limit', 'border', 'edge', 'margin', 'side', 'end', 'beginning', 'start', 'finish', 'completion', 'conclusion', 'termination', 'cessation', 'stop', 'pause', 'break', 'interval', 'gap', 'space', 'distance', 'length', 'width', 'height', 'depth', 'size', 'dimension', 'measurement', 'calculation', 'computation', 'estimation', 'evaluation', 'assessment', 'analysis', 'examination', 'investigation', 'research', 'study', 'survey', 'review', 'inspection', 'check', 'test', 'trial', 'experiment', 'attempt', 'effort', 'try', 'endeavor', 'struggle', 'fight', 'battle', 'war', 'conflict', 'competition', 'contest', 'match', 'game', 'sport', 'activity', 'action', 'behavior', 'conduct', 'performance', 'achievement', 'accomplishment', 'success', 'failure', 'victory', 'defeat', 'win', 'lose', 'gain', 'obtain', 'acquire', 'get', 'receive', 'take', 'give', 'provide', 'supply', 'offer', 'present', 'show', 'display', 'exhibit', 'demonstrate', 'prove', 'confirm', 'verify', 'validate', 'justify', 'explain', 'describe', 'illustrate', 'clarify', 'specify', 'define', 'identify', 'recognize', 'distinguish', 'differentiate', 'separate', 'divide', 'split', 'break', 'tear', 'cut', 'slice', 'chop', 'crush', 'squeeze', 'press', 'push', 'pull', 'drag', 'carry', 'transport', 'move', 'shift', 'transfer', 'deliver', 'send', 'ship', 'mail', 'post', 'publish', 'release', 'issue', 'distribute', 'spread', 'share', 'communicate', 'inform', 'notify', 'alert', 'warn', 'advise', 'recommend', 'suggest', 'propose', 'offer', 'invite', 'request', 'ask', 'question', 'inquire', 'wonder', 'doubt', 'suspect', 'believe', 'think', 'feel', 'sense', 'perceive', 'notice', 'observe', 'see', 'look', 'watch', 'view', 'examine', 'inspect', 'check', 'monitor', 'track', 'follow', 'pursue', 'chase', 'hunt', 'search', 'seek', 'find', 'discover', 'locate', 'place', 'position', 'put', 'set', 'lay', 'rest', 'sit', 'stand', 'walk', 'run', 'jump', 'climb', 'fall', 'drop', 'rise', 'lift', 'raise', 'lower', 'reduce', 'decrease', 'increase', 'add', 'subtract', 'multiply', 'divide', 'calculate', 'count', 'measure', 'weigh', 'balance', 'compare', 'contrast', 'match', 'fit', 'suit', 'adapt', 'adjust', 'modify', 'change', 'alter', 'transform', 'convert', 'switch', 'turn', 'rotate', 'spin', 'twist', 'bend', 'fold', 'wrap', 'cover', 'hide', 'conceal', 'reveal', 'expose', 'uncover', 'open', 'close', 'shut', 'lock', 'unlock', 'secure', 'fasten', 'attach', 'connect', 'link', 'join', 'combine', 'merge', 'unite', 'integrate', 'incorporate', 'include', 'exclude', 'omit', 'skip', 'avoid', 'prevent', 'stop', 'block', 'restrict', 'limit', 'control', 'manage', 'handle', 'deal', 'cope', 'struggle', 'survive', 'endure', 'tolerate', 'accept', 'reject', 'refuse', 'deny', 'confirm', 'approve', 'disapprove', 'agree', 'disagree', 'support', 'oppose', 'resist', 'fight', 'defend', 'protect', 'guard', 'watch', 'care', 'tend', 'maintain', 'preserve', 'conserve', 'save', 'rescue', 'recover', 'restore', 'repair', 'fix', 'mend', 'heal', 'cure', 'treat', 'help', 'assist', 'aid', 'support', 'encourage', 'motivate', 'inspire', 'influence', 'persuade', 'convince', 'force', 'compel', 'require', 'demand', 'order', 'command', 'direct', 'guide', 'lead', 'follow', 'obey', 'comply', 'conform', 'adapt', 'adjust', 'accommodate', 'satisfy', 'please', 'delight', 'enjoy', 'appreciate', 'value', 'treasure', 'cherish', 'love', 'like', 'prefer', 'choose', 'select', 'pick', 'decide', 'determine', 'conclude', 'judge', 'evaluate', 'assess', 'rate', 'rank', 'grade', 'score', 'mark', 'note', 'record', 'document', 'write', 'type', 'print', 'copy', 'duplicate', 'repeat', 'reproduce', 'create', 'make', 'build', 'construct', 'design', 'plan', 'organize', 'arrange', 'prepare', 'ready', 'set', 'establish', 'found', 'start', 'begin', 'initiate', 'launch', 'introduce', 'present', 'offer', 'provide', 'supply', 'deliver', 'serve', 'attend', 'participate', 'involve', 'engage', 'interact', 'communicate', 'relate', 'connect', 'associate', 'affiliate', 'belong', 'own', 'possess', 'have', 'hold', 'keep', 'retain', 'maintain', 'continue', 'proceed', 'advance', 'progress', 'develop', 'grow', 'expand', 'extend', 'stretch', 'reach', 'achieve', 'accomplish', 'complete', 'finish', 'end', 'conclude', 'terminate', 'stop', 'cease', 'quit', 'leave', 'depart', 'exit', 'escape', 'flee', 'return', 'come', 'arrive', 'enter', 'join', 'visit', 'stay', 'remain', 'wait', 'expect', 'anticipate', 'hope', 'wish', 'want', 'need', 'require', 'lack', 'miss', 'lose', 'forget', 'remember', 'recall', 'remind', 'memorize', 'learn', 'study', 'teach', 'educate', 'train', 'practice', 'exercise', 'work', 'labor', 'toil', 'effort', 'attempt', 'try', 'test', 'check', 'verify', 'confirm', 'ensure', 'guarantee', 'promise', 'pledge', 'commit', 'dedicate', 'devote', 'contribute', 'donate', 'give', 'offer', 'present', 'grant', 'award', 'provide', 'supply', 'furnish', 'equip', 'prepare', 'ready', 'arrange', 'organize', 'plan', 'design', 'create', 'develop', 'produce', 'generate', 'cause', 'result', 'lead', 'bring', 'carry', 'bear', 'support', 'sustain', 'maintain', 'preserve', 'protect', 'defend', 'guard', 'secure', 'safe', 'danger', 'risk', 'threat', 'harm', 'damage', 'injury', 'hurt', 'pain', 'suffer', 'ache', 'feel', 'sense', 'experience', 'undergo', 'face', 'encounter', 'meet', 'greet', 'welcome', 'accept', 'receive', 'get', 'obtain', 'acquire', 'gain', 'earn', 'win', 'achieve', 'reach', 'attain', 'accomplish', 'succeed', 'fail', 'lose', 'miss', 'lack', 'need', 'want', 'desire', 'wish', 'hope', 'expect', 'anticipate', 'predict', 'forecast', 'estimate', 'guess', 'assume', 'suppose', 'presume', 'believe', 'think', 'consider', 'regard', 'view', 'see', 'perceive', 'understand', 'comprehend', 'grasp', 'realize', 'recognize', 'acknowledge', 'admit', 'confess', 'reveal', 'disclose', 'expose', 'show', 'display', 'demonstrate', 'prove', 'evidence', 'indicate', 'suggest', 'imply', 'mean', 'signify', 'represent', 'symbolize', 'stand', 'denote', 'refer', 'relate', 'concern', 'involve', 'include', 'contain', 'comprise', 'consist', 'made', 'formed', 'shaped', 'built', 'constructed', 'created', 'designed', 'planned', 'intended', 'meant', 'supposed', 'expected', 'required', 'needed', 'necessary', 'essential', 'important', 'significant', 'major', 'minor', 'small', 'large', 'big', 'huge', 'tiny', 'little', 'great', 'good', 'bad', 'right', 'wrong', 'correct', 'incorrect', 'true', 'false', 'real', 'fake', 'genuine', 'artificial', 'natural', 'normal', 'abnormal', 'usual', 'unusual', 'common', 'rare', 'frequent', 'infrequent', 'regular', 'irregular', 'consistent', 'inconsistent', 'constant', 'variable', 'stable', 'unstable', 'steady', 'unsteady', 'firm', 'weak', 'strong', 'powerful', 'powerless', 'effective', 'ineffective', 'efficient', 'inefficient', 'successful', 'unsuccessful', 'useful', 'useless', 'helpful', 'unhelpful', 'beneficial', 'harmful', 'positive', 'negative', 'active', 'inactive', 'passive', 'aggressive', 'peaceful', 'violent', 'calm', 'excited', 'quiet', 'loud', 'silent', 'noisy', 'bright', 'dark', 'light', 'heavy', 'easy', 'difficult', 'hard', 'soft', 'smooth', 'rough', 'clean', 'dirty', 'pure', 'impure', 'clear', 'unclear', 'obvious', 'hidden', 'visible', 'invisible', 'open', 'closed', 'free', 'restricted', 'limited', 'unlimited', 'bound', 'unbound', 'tied', 'untied', 'connected', 'disconnected', 'attached', 'detached', 'separate', 'together', 'apart', 'near', 'far', 'close', 'distant', 'local', 'remote', 'present', 'absent', 'available', 'unavailable', 'ready', 'unready', 'prepared', 'unprepared', 'complete', 'incomplete', 'finished', 'unfinished', 'done', 'undone', 'solved', 'unsolved', 'answered', 'unanswered', 'known', 'unknown', 'familiar', 'unfamiliar', 'recognized', 'unrecognized', 'identified', 'unidentified', 'named', 'unnamed', 'titled', 'untitled', 'labeled', 'unlabeled', 'marked', 'unmarked', 'signed', 'unsigned', 'written', 'unwritten', 'spoken', 'unspoken', 'said', 'unsaid', 'told', 'untold', 'heard', 'unheard', 'seen', 'unseen', 'watched', 'unwatched', 'observed', 'unobserved', 'noticed', 'unnoticed', 'found', 'lost', 'discovered', 'undiscovered', 'located', 'misplaced', 'placed', 'displaced', 'moved', 'unmoved', 'changed', 'unchanged', 'modified', 'unmodified', 'altered', 'unaltered', 'adjusted', 'unadjusted', 'fixed', 'broken', 'repaired', 'damaged', 'intact', 'destroyed', 'built', 'demolished', 'constructed', 'deconstructed', 'assembled', 'disassembled', 'created', 'destroyed', 'made', 'unmade', 'produced', 'consumed', 'generated', 'eliminated', 'formed', 'deformed', 'shaped', 'misshapen', 'organized', 'disorganized', 'arranged', 'disarranged', 'ordered', 'disordered', 'sorted', 'unsorted', 'classified', 'unclassified', 'categorized', 'uncategorized', 'grouped', 'ungrouped', 'collected', 'scattered', 'gathered', 'dispersed', 'united', 'divided', 'combined', 'separated', 'merged', 'split', 'joined', 'disjoined', 'connected', 'disconnected', 'linked', 'unlinked', 'related', 'unrelated', 'associated', 'unassociated', 'affiliated', 'unaffiliated', 'allied', 'opposed', 'friendly', 'hostile', 'cooperative', 'uncooperative', 'helpful', 'unhelpful', 'supportive', 'unsupportive', 'encouraging', 'discouraging', 'motivating', 'demotivating', 'inspiring', 'uninspiring', 'exciting', 'boring', 'interesting', 'uninteresting', 'engaging', 'disengaging', 'attractive', 'unattractive', 'appealing', 'unappealing', 'desirable', 'undesirable', 'wanted', 'unwanted', 'welcome', 'unwelcome', 'accepted', 'rejected', 'approved', 'disapproved', 'liked', 'disliked', 'loved', 'hated', 'appreciated', 'unappreciated', 'valued', 'undervalued', 'respected', 'disrespected', 'honored', 'dishonored', 'praised', 'criticized', 'complimented', 'insulted', 'flattered', 'offended', 'pleased', 'displeased', 'satisfied', 'dissatisfied', 'happy', 'unhappy', 'glad', 'sad', 'joyful', 'sorrowful', 'cheerful', 'gloomy', 'optimistic', 'pessimistic', 'hopeful', 'hopeless', 'confident', 'doubtful', 'certain', 'uncertain', 'sure', 'unsure', 'convinced', 'unconvinced', 'believing', 'disbelieving', 'trusting', 'distrusting', 'faithful', 'unfaithful', 'loyal', 'disloyal', 'devoted', 'undevoted', 'committed', 'uncommitted', 'dedicated', 'undedicated', 'responsible', 'irresponsible', 'reliable', 'unreliable', 'dependable', 'undependable', 'trustworthy', 'untrustworthy', 'honest', 'dishonest', 'truthful', 'untruthful', 'sincere', 'insincere', 'genuine', 'fake', 'authentic', 'inauthentic', 'real', 'artificial', 'natural', 'unnatural', 'normal', 'abnormal', 'typical', 'atypical', 'standard', 'nonstandard', 'regular', 'irregular', 'ordinary', 'extraordinary', 'common', 'uncommon', 'usual', 'unusual', 'expected', 'unexpected', 'predictable', 'unpredictable', 'likely', 'unlikely', 'probable', 'improbable', 'possible', 'impossible', 'feasible', 'infeasible', 'practical', 'impractical', 'realistic', 'unrealistic', 'reasonable', 'unreasonable', 'sensible', 'nonsensical', 'logical', 'illogical', 'rational', 'irrational', 'wise', 'unwise', 'smart', 'stupid', 'intelligent', 'unintelligent', 'clever', 'dull', 'bright', 'dim', 'sharp', 'blunt', 'quick', 'slow', 'fast', 'sluggish', 'rapid', 'gradual', 'sudden', 'immediate', 'delayed', 'prompt', 'late', 'early', 'timely', 'untimely', 'punctual', 'tardy', 'fresh', 'stale', 'new', 'old', 'recent', 'ancient', 'modern', 'outdated', 'current', 'past', 'present', 'future', 'temporary', 'permanent', 'brief', 'lengthy', 'short', 'long', 'quick', 'extended', 'limited', 'unlimited', 'finite', 'infinite', 'bounded', 'unbounded', 'restricted', 'unrestricted', 'narrow', 'wide', 'broad', 'specific', 'general', 'particular', 'universal', 'individual', 'collective', 'personal', 'public', 'private', 'secret', 'open', 'closed', 'transparent', 'opaque', 'clear', 'murky', 'obvious', 'subtle', 'direct', 'indirect', 'straightforward', 'complicated', 'simple', 'complex', 'easy', 'difficult', 'effortless', 'challenging', 'smooth', 'rough', 'gentle', 'harsh', 'mild', 'severe', 'light', 'heavy', 'weak', 'strong', 'soft', 'hard', 'flexible', 'rigid', 'loose', 'tight', 'relaxed', 'tense', 'calm', 'agitated', 'peaceful', 'turbulent', 'quiet', 'noisy', 'silent', 'loud', 'mute', 'vocal', 'wordless', 'verbal', 'spoken', 'written', 'oral', 'textual', 'visual', 'auditory', 'physical', 'mental', 'emotional', 'spiritual', 'material', 'immaterial', 'tangible', 'intangible', 'concrete', 'abstract', 'real', 'imaginary', 'actual', 'theoretical', 'practical', 'academic', 'applied', 'pure', 'mixed', 'clean', 'dirty', 'neat', 'messy', 'organized', 'chaotic', 'structured', 'unstructured', 'formal', 'informal', 'official', 'unofficial', 'legal', 'illegal', 'lawful', 'unlawful', 'legitimate', 'illegitimate', 'valid', 'invalid', 'correct', 'incorrect', 'accurate', 'inaccurate', 'precise', 'imprecise', 'exact', 'approximate', 'perfect', 'imperfect', 'flawless', 'flawed', 'ideal', 'realistic', 'optimal', 'suboptimal', 'best', 'worst', 'better', 'worse', 'superior', 'inferior', 'excellent', 'poor', 'outstanding', 'mediocre', 'exceptional', 'ordinary', 'remarkable', 'unremarkable', 'notable', 'insignificant', 'important', 'unimportant', 'significant', 'trivial', 'major', 'minor', 'primary', 'secondary', 'main', 'auxiliary', 'central', 'peripheral', 'core', 'marginal', 'essential', 'nonessential', 'necessary', 'unnecessary', 'required', 'optional', 'mandatory', 'voluntary', 'compulsory', 'elective', 'forced', 'chosen', 'imposed', 'selected', 'rejected', 'accepted', 'denied', 'granted', 'refused', 'allowed', 'forbidden', 'permitted', 'prohibited', 'authorized', 'unauthorized', 'approved', 'disapproved', 'endorsed', 'opposed', 'supported', 'resisted', 'encouraged', 'discouraged', 'promoted', 'demoted', 'advanced', 'retreated', 'progressed', 'regressed', 'improved', 'deteriorated', 'enhanced', 'diminished', 'increased', 'decreased', 'expanded', 'contracted', 'grown', 'shrunk', 'developed', 'undeveloped', 'mature', 'immature', 'ripe', 'unripe', 'ready', 'unready', 'prepared', 'unprepared', 'complete', 'incomplete', 'whole', 'partial', 'full', 'empty', 'filled', 'vacant', 'occupied', 'available', 'busy', 'free', 'engaged', 'active', 'inactive', 'working', 'broken', 'functional', 'dysfunctional', 'operational', 'inoperative', 'effective', 'ineffective', 'efficient', 'inefficient', 'productive', 'unproductive', 'successful', 'unsuccessful', 'winning', 'losing', 'victorious', 'defeated', 'triumphant', 'failed', 'achieved', 'missed', 'accomplished', 'unfinished', 'completed', 'started', 'begun', 'ended', 'continued', 'stopped', 'paused', 'resumed', 'interrupted', 'sustained', 'maintained', 'preserved', 'destroyed', 'damaged', 'harmed', 'hurt', 'injured', 'wounded', 'healed', 'cured', 'treated', 'helped', 'assisted', 'supported', 'aided', 'served', 'attended', 'cared', 'neglected', 'ignored', 'overlooked', 'noticed', 'observed', 'watched', 'monitored', 'tracked', 'followed', 'led', 'guided', 'directed', 'controlled', 'managed', 'handled', 'dealt', 'coped', 'struggled', 'fought', 'battled', 'competed', 'challenged', 'opposed', 'resisted', 'defended', 'attacked', 'protected', 'threatened', 'endangered', 'safeguarded', 'secured', 'risked', 'gambled', 'bet', 'wagered', 'invested', 'spent', 'saved', 'earned', 'gained', 'lost', 'won', 'acquired', 'obtained', 'received', 'got', 'took', 'gave', 'provided', 'supplied', 'offered', 'presented', 'delivered', 'sent', 'brought', 'carried', 'transported', 'moved', 'shifted', 'transferred', 'exchanged', 'traded', 'sold', 'bought', 'purchased', 'acquired', 'owned', 'possessed', 'held', 'kept', 'retained', 'maintained', 'preserved', 'stored', 'saved', 'collected', 'gathered', 'assembled', 'accumulated', 'amassed', 'compiled', 'organized', 'arranged', 'sorted', 'classified', 'categorized', 'grouped', 'divided', 'separated', 'split', 'broken', 'torn', 'cut', 'sliced', 'chopped', 'crushed', 'smashed', 'destroyed', 'demolished', 'ruined', 'wrecked', 'damaged', 'harmed', 'hurt', 'injured', 'wounded', 'killed', 'murdered', 'assassinated', 'executed', 'eliminated', 'removed', 'deleted', 'erased', 'cancelled', 'abolished', 'terminated', 'ended', 'finished', 'completed', 'concluded', 'closed', 'shut', 'stopped', 'ceased', 'quit', 'abandoned', 'left', 'departed', 'exited', 'escaped', 'fled', 'ran', 'walked', 'moved', 'went', 'came', 'arrived', 'reached', 'entered', 'joined', 'participated', 'involved', 'engaged', 'included', 'excluded', 'omitted', 'skipped', 'avoided', 'prevented', 'stopped', 'blocked', 'restricted', 'limited', 'controlled', 'regulated', 'governed', 'ruled', 'managed', 'administered', 'operated', 'conducted', 'performed', 'executed', 'carried', 'accomplished', 'achieved', 'completed', 'finished', 'done', 'made', 'created', 'produced', 'generated', 'caused', 'resulted', 'led', 'brought', 'took', 'been', 'was', 'were', 'are', 'is', 'am', 'be', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall', 'ought', 'need', 'dare', 'used'
    ]);
    
    // If no cached stories yet (initial load), use default trending topics initially
    if (cachedTopStories.length === 0) {
      console.log('No cached stories available yet, using default trending topics');
      
      // During initial load, we'll prioritize these topics first
      const initialTopics = [
        { id: 'initial_1', name: 'Breaking News', path: '/search?q=breaking%20news', category: 'trending', searchTerm: 'breaking news', weight: 10 },
        { id: 'initial_2', name: 'Top Stories', path: '/category/home', category: 'home', searchTerm: 'top stories', weight: 9 },
        { id: 'initial_3', name: 'Headlines', path: '/search?q=headlines', category: 'trending', searchTerm: 'headlines', weight: 8 },
        // Add preset trending topics that are likely to have content
        ...baseTrendingTopics.filter(topic => ['White House', 'Stock Market', 'AI', 'Climate Change'].includes(topic.name))
      ];
      
      return [...initialTopics, ...baseTrendingTopics];
    }
    
    // Process keywords from articles to find trending terms
    cachedTopStories.forEach(article => {
      const keywords = article.keywords || article.des_facet || [];
      
      // Process article title and section for additional keywords, but filter more carefully
      const titleWords = (article.title || '').toLowerCase().split(/\s+/);
      const sectionName = article.section || '';
      
      // Only use meaningful keywords from structured data and section names
      // Skip individual title words to avoid nonsensical trending topics
      [...keywords, sectionName].forEach(keyword => {
        if (typeof keyword !== 'string') return;
        
        const term = keyword.toLowerCase().trim();
        // Skip short terms, dates, and stop words
        if (term.length < 3 || dateKeywords.has(term) || stopWords.has(term)) return;
        
        keywordFrequency[term] = (keywordFrequency[term] || 0) + 1;
      });
    });
    
    // Sort by frequency to find popular terms
    const sortedTerms = Object.entries(keywordFrequency)
      .sort((a, b) => b[1] - a[1])
      .filter(([term, count]) => {
        // Only include terms that appear at least twice and are meaningful
        return term.length > 3 && count > 1 && !stopWords.has(term) && !dateKeywords.has(term);
      })
      .slice(0, 6); // Take top 6 meaningful terms
    
    // Create dynamic topics from trending terms
    const dynamicTopics = sortedTerms.map(([term, count], index) => {
      // Convert to title case for display
      const displayName = term
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
        
      return {
        id: `dynamic_${index}`,
        name: displayName,
        path: `/search?q=${encodeURIComponent(term)}`,
        category: 'trending',
        searchTerm: term,
        dynamicallyGenerated: true,
        weight: count
      };
    });
    
    // Combine with base topics for validation
    const allPossibleTopics = [...dynamicTopics, ...baseTrendingTopics];
    return allPossibleTopics;
  }, [baseTrendingTopics]);
  
  // Main function to validate and update topics
  const validateAndUpdateTopics = useCallback(async (forceRefresh = false) => {
    try {
      setIsRefreshing(true);
      
      // Identify potential topics including dynamically generated ones
      const possibleTopics = await identifyTrendingTopics();
      
      // Track which topics have content
      const validatedTopics = [];
      const searchTopicsWithContent = new Set();
      const availableCategories = new Set();
      
      // Check if this is the initial load by checking for existing cached stories
      const cachedTopStories = JSON.parse(sessionStorage.getItem('topStories') || '[]');
      const isInitialLoad = cachedTopStories.length === 0;
      
      // For initial load or forced refresh, always fetch fresh content first
      if (isInitialLoad || forceRefresh) {
        try {
          console.log('Fetching fresh home stories for trending topics');
          const homeArticles = await getTopStories('home');
          
          // Extract categories from fresh articles
          homeArticles.forEach(article => {
            if (article.section) {
              availableCategories.add(article.section.toLowerCase());
            }
          });
          
          // Store in session for future use
          sessionStorage.setItem('topStories', JSON.stringify(homeArticles));
          sessionStorage.setItem('lastTrendingFetch', Date.now().toString());
        } catch (error) {
          console.error('Error fetching home stories:', error);
        }
      } else {
        // Use cached data if not initial load
        cachedTopStories.forEach(article => {
          if (article.section) {
            availableCategories.add(article.section.toLowerCase());
          }
        });
      }
      
      // Check category-specific caches but don't fetch all at once - SIMPLIFIED
      const categories = ['politics', 'business', 'technology'];  // Reduced from 9 to 3 categories
      for (const cat of categories) {
        try {
          const catArticles = JSON.parse(sessionStorage.getItem(`category_${cat}`) || '[]');
          if (catArticles.length > 0) {
            availableCategories.add(cat);
          }
          // Only fetch 1 category per session and only if cache is very old (30+ minutes)
          else if (isInitialLoad && (!sessionStorage.getItem('lastTrendingFetch') || 
                   Date.now() - parseInt(sessionStorage.getItem('lastTrendingFetch')) > 1800000)) { // 30 minutes
            // Limit to only 1 category per session to avoid API overload
            const fetchedCategoriesCount = parseInt(sessionStorage.getItem('fetchedCategoriesCount') || '0');
            if (fetchedCategoriesCount === 0) { // Only fetch one category total
              try {
                console.log(`🔄 Fetching single category: ${cat}`);
                const categoryArticles = await getTopStories(cat);
                if (categoryArticles.length > 0) {
                  availableCategories.add(cat);
                  sessionStorage.setItem(`category_${cat}`, JSON.stringify(categoryArticles));
                  sessionStorage.setItem('fetchedCategoriesCount', '1');
                  sessionStorage.setItem('lastTrendingFetch', Date.now().toString());
                }
                break; // Stop after first successful fetch
              } catch (e) {
                console.error(`Error fetching ${cat} articles:`, e);
              }
            }
          }
        } catch (e) {
          console.error(`Error accessing cached ${cat} articles:`, e);
        }
      }
      
      // If we don't have enough categories, fetch home stories
      if (availableCategories.size < 3 || forceRefresh) {
        try {
          const homeArticles = await getTopStories('home');
          homeArticles.forEach(article => {
            if (article.section) {
              availableCategories.add(article.section.toLowerCase());
            }
          });
        } catch (error) {
          console.error('Error fetching home stories:', error);
        }
      }
      
      // Add category-based topics first
      for (const topic of possibleTopics) {
        // For category-based topics, check if that category is available
        if (topic.path.startsWith('/category/')) {
          const categoryName = topic.path.replace('/category/', '');
          if (availableCategories.has(categoryName)) {
            validatedTopics.push(topic);
          }
        }
      }
      
      // Prioritize dynamically generated topics and those requiring validation
      const highPriorityTopics = possibleTopics.filter(topic => 
        topic.dynamicallyGenerated || topic.requireValidation
      );
      
      // Include other search-based topics
      const otherTopics = possibleTopics.filter(topic => 
        !topic.dynamicallyGenerated && 
        !topic.requireValidation && 
        topic.path.includes('/search?q=')
      );
      
      // Combine lists with priority order
      const searchBasedTopics = [...highPriorityTopics, ...otherTopics];
      
      // Check for cached search results first
      for (const topic of searchBasedTopics) {
        if (!topic.searchTerm) continue;
        
        const cachedResults = sessionStorage.getItem(`search_${topic.searchTerm}`);
        if (cachedResults) {
          const results = JSON.parse(cachedResults);
          if (Array.isArray(results) && results.length > 0) {
            searchTopicsWithContent.add(topic.searchTerm);
          }
        }
      }
      
      // For those not validated from cache, make API calls (prioritize dynamic topics)
      // Limit to 5 API calls to avoid rate limiting
      const topicsToValidate = searchBasedTopics
        .filter(topic => !searchTopicsWithContent.has(topic.searchTerm))
        .sort((a, b) => {
          // Prioritize dynamic topics, then by weight
          if (a.dynamicallyGenerated && !b.dynamicallyGenerated) return -1;
          if (!a.dynamicallyGenerated && b.dynamicallyGenerated) return 1;
          return (b.weight || 0) - (a.weight || 0);
        })
        .slice(0, 5);
      
      if (topicsToValidate.length > 0) {
        // Use sequential validation instead of parallel to avoid overwhelming the API
        const validationResults = [];
        
        for (let i = 0; i < topicsToValidate.length; i++) {
          const topic = topicsToValidate[i];
          try {
            // Add a small delay between requests to prevent rate limiting
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            const result = await searchArticles(topic.searchTerm, 1);
            const hasContent = !!(result && result.articles && result.articles.length > 0);
            
            // If this is a dynamic topic and has content, save to session storage
            if (hasContent && topic.dynamicallyGenerated) {
              sessionStorage.setItem(`search_${topic.searchTerm}`, JSON.stringify(result.articles));
            }
            
            validationResults.push({
              status: 'fulfilled',
              value: {
                topic,
                hasContent
              }
            });
          } catch (error) {
            console.error(`Error validating topic ${topic.name}:`, error);
            validationResults.push({
              status: 'rejected',
              value: { topic, hasContent: false }
            });
          }
        }
        
        // Add topics that have content
        validationResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value.hasContent) {
            searchTopicsWithContent.add(result.value.topic.searchTerm);
          }
        });
      }
      
      // Add all validated search-based topics
      const searchTopicsToAdd = searchBasedTopics.filter(topic => 
        searchTopicsWithContent.has(topic.searchTerm)
      );
      
      // Add category-based topics (they don't need search validation)
      const categoryTopicsToAdd = possibleTopics.filter(topic => 
        topic.path && topic.path.startsWith('/category/') && availableCategories.has(topic.category)
      );
      
      validatedTopics.push(...searchTopicsToAdd);
      validatedTopics.push(...categoryTopicsToAdd);
      
      // Prioritize:
      // 1. Dynamic topics (they're currently trending)
      // 2. Topics with higher weight
      // 3. Standard topics
      const finalTopics = validatedTopics
        .sort((a, b) => {
          if (a.dynamicallyGenerated && !b.dynamicallyGenerated) return -1;
          if (!a.dynamicallyGenerated && b.dynamicallyGenerated) return 1;
          return (b.weight || 0) - (a.weight || 0);
        })
        .slice(0, 8); // Limit to 8 topics
      
      setAvailableTopics(finalTopics);
      setRefreshTime(new Date().toLocaleTimeString());
      
    } catch (error) {
      console.error('Error updating trending topics:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [identifyTrendingTopics]);
  
  // Initial load
  useEffect(() => {
    validateAndUpdateTopics();
    
    // Set up periodic refresh every 30 minutes
    const refreshInterval = setInterval(() => {
      validateAndUpdateTopics(true);
    }, 30 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [validateAndUpdateTopics]);
  
  const handleRefresh = () => {
    if (!isRefreshing) {
      validateAndUpdateTopics(true);
    }
  };

  if (loading) {
    return (
      <div className="trending-topics my-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <TrendingUp className="mr-2 text-red-600" size={20} />
          Trending Topics
        </h3>
        <div className="flex flex-wrap gap-2 mt-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="px-3 py-1 bg-gray-100 rounded-full w-20 h-6 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (availableTopics.length === 0) {
    // If no topics are available, don't show the component at all
    return null;
  }

  return (
    <div className="trending-topics my-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold flex items-center">
          <TrendingUp className="mr-2 text-red-600" size={20} />
          Trending Topics
        </h3>

        <div className="flex items-center">
          {refreshTime && (
            <span className="text-xs text-gray-500 mr-2">
              Updated: {refreshTime}
            </span>
          )}
          <button
            onClick={handleRefresh}
            className={`text-gray-500 hover:text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh trending topics"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-3">
        {availableTopics.map((topic, index) => (
          <Link
            key={`${topic.id}-${index}`}
            to={topic.path}
            className={`px-3 py-1 rounded-full text-sm transition-colors duration-200 ${
              topic.dynamicallyGenerated 
                ? 'bg-red-100 hover:bg-red-200 text-red-700' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            {topic.name}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TrendingTopics;