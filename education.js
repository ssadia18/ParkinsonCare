const parkinsonsInfo = {
  overview: {
    title: "Understanding Parkinson's Disease",
        content: `Parkinson's disease is a progressive neurological disorder that affects movement. It occurs when nerve cells (neurons) in the brain that produce dopamine begin to die. Dopamine is a neurotransmitter that helps control movement and emotional responses.'

Key Facts:
• Affects approximately 1% of people over 60 years old
• More common in men than women
• Usually develops after age 50
• Can occur earlier (early-onset Parkinson's)`
    },
  symptoms: {
    title: "Common Symptoms",
        content: `Primary Motor Symptoms:
• Tremors (shaking) in hands, arms, legs, jaw, or head
• Muscle stiffness or rigidity
• Slowness of movement (bradykinesia)
• Impaired balance and coordination

Secondary Symptoms:
• Depression and anxiety
• Sleep problems
• Cognitive changes
• Speech and swallowing difficulties
• Constipation
• Fatigue
• Loss of smell`
    },
  stages: {
    title: "Disease Progression",
        content: `Parkinson's disease typically progresses through five stages:

Stage 1: Mild symptoms, usually on one side of the body
Stage 2: Symptoms on both sides, but balance is not affected
Stage 3: Balance problems, but still independent
Stage 4: Severe symptoms, but can still walk or stand
Stage 5: Wheelchair-bound or bedridden, requires constant care`
    },
  treatment: {
    title: "Treatment Options",
        content: `Current treatment approaches include:

1. Medications:
• Levodopa (most effective)
• Dopamine agonists
• MAO-B inhibitors
• COMT inhibitors

2. Surgical Options:
• Deep Brain Stimulation (DBS)
• Focused ultrasound

3. Lifestyle Management:
• Regular exercise
• Physical therapy
• Occupational therapy
• Speech therapy
• Dietary modifications`
    },
};

function showEducationalContent() {
  const container = document.getElementById('educationalContent');
  container.innerHTML = Object.values(parkinsonsInfo).map(info =>
    `<div class='card'><h3>${info.title}</h3><p>${info.content}</p></div>`
  ).join('');
}

document.addEventListener('DOMContentLoaded', showEducationalContent);