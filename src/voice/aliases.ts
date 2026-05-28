export const championAliases: Record<string, string> = {
  'cho gath': "Cho'Gath",
  'kog maw': "Kog'Maw",
  'kai sa': "Kai'Sa",
  'kha zix': "Kha'Zix",
  'rek sai': "Rek'Sai",
  'ksante': "K'Sante",
  'jarvan iv': 'Jarvan IV',
  'lee sin': 'Lee Sin',
  'master yi': 'Master Yi',
  'miss fortune': 'Miss Fortune',
  'twisted fate': 'Twisted Fate',
  'dr mundo': 'Dr. Mundo',
  'dr mundoo': 'Dr. Mundo',
  'tahm kench': 'Tahm Kench',
  'vel koz': "Vel'Koz",
  'xin zhao': 'Xin Zhao',
  'renata': 'Renata Glasc',
  'monkey king': 'Wukong',
  'wu kong': 'Wukong',
  'maokai': 'Maokai',
  'aurelion sol': 'Aurelion Sol',
  'miss fortunee': 'Miss Fortune',
  'le blanc': 'LeBlanc',
  'kai saa': "Kai'Sa",
  'katarina': 'Katarina',
};

export const itemAliases: Record<string, string> = {
  'thorn male': 'Thornmail',
  'thorn mail': 'Thornmail',
  'heart steal': 'Heartsteel',
  'heart steel': 'Heartsteel',
  'you moose': "Youmuu's Ghostblade",
  'youmuu': "Youmuu's Ghostblade",
  'infinity edgee': 'Infinity Edge',
  'force of natures': 'Force of Nature',
  'rogues king': "Ravenous Hydra",
  'black cleaver': 'Black Cleaver',
  'dead mans plate': "Dead Man's Plate",
  'dead man plate': "Dead Man's Plate",
  'spectral cowl': 'Spectral Cowl',
  'morello': "Morellonomicon",
  'morellos': "Morellonomicon",
  'shadow flame': 'Shadowflame',
};

export const commonWhisperMistakes: Record<string, string> = {
  'built thorn male': 'built Thornmail',
  'bought thorn male': 'bought Thornmail',
  'built heart steal': 'built Heartsteel',
  'bought heart steal': 'bought Heartsteel',
  'what should i build': 'what should I build',
  'what do i build': 'what should I build',
  'what should i buy': 'what should I build',
  'enemy build update': 'enemy build update',
};

export const aliases: Record<string, string> = {
  ...championAliases,
  ...itemAliases,
  ...commonWhisperMistakes,
};

