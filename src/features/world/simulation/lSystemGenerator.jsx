export const generateLSystem = (iterations = 2) => {
  let state = "X"; 
  const rules = {
    "X": "F[+X][-X][&X][^X]F", 
    "F": "FF"
  };

  for (let i = 0; i < iterations; i++) {
    state = state.split('').map(char => rules[char] || char).join('');
  }
  return state;
};

export const bushParams = {
  angle: (35 * Math.PI) / 180,
  length: 0.7,
  decay: 0.8
};