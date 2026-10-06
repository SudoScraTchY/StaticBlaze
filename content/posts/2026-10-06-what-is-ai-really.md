---
title: "What Is AI, Really? A Plain-Language Explanation"
slug: what-is-ai-really
description: "How language models learn, why they have a Knowledge Cutoff, and why they predict patterns instead of recalling facts, explained without jargon."
author: mehrshad
category: ai
tags: [language-models, ai-for-biologists]
published: 2026-01-10T10:00:00Z
featured: true
---

# What Is AI, Really? A Plain-Language Explanation

**AI For Biologists, Part 1**

![07ca4c1c66eab0b6b28d2dbad5a0636b4c47e0884998b4d2bc32b25dac59f522](assets/07ca4c1c66eab0b6b28d2dbad5a0636b4c47e0884998b4d2bc32b25dac59f522.bin)

Most people use AI tools without a clear picture of what is happening on the other side of the screen. Some treat the tool like magic. Others treat it like a search engine that happens to write full sentences. Both pictures lead to the same problem: expectations that do not match what the tool actually is, followed by disappointment or misplaced trust.

This post builds the correct picture from the ground up, using everyday comparisons instead of equations or code.

---

## The idea is old. The chat window is new.

The idea of a machine that thinks is not recent. It was taken seriously as a scientific question as far back as the 1950s, and researchers have worked on it continuously since then. What changed recently is not the idea but the **form** it takes for ordinary people: typing a message to a model such as ChatGPT or Claude and getting a conversational answer back. That experience is only about 3 to 4 years old.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#DBEAFE','primaryTextColor':'#0F172A','primaryBorderColor':'#2563EB','lineColor':'#64748B','cScale0':'#94A3B8','cScale1':'#2563EB','cScaleLabel0':'#ffffff','cScaleLabel1':'#ffffff','fontFamily':'Inter, sans-serif'}}}%%
timeline
    title Decades of research, a few years of chat
    section Research era
        1950s : The idea of a thinking machine becomes a serious scientific question
        Following decades : Generations of researchers build on it, step by step
    section Chat era
        About 3 to 4 years ago : Conversational models such as ChatGPT and Claude reach the public
```
A useful comparison is a therapy that spent decades in laboratories before reaching patients. The science was slowly accumulating the whole time. The moment it became widely available felt sudden, but the foundation was built long before.

The chat interface that feels like a brand-new phenomenon is the most recent link in a long chain of work.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#F1F5F9','primaryTextColor':'#0F172A','primaryBorderColor':'#94A3B8','lineColor':'#64748B','fontFamily':'Inter, sans-serif'}}}%%
flowchart LR
    classDef old fill:#F1F5F9,stroke:#94A3B8,color:#334155,stroke-width:1.5px
    classDef new fill:#2563EB,stroke:#1E40AF,color:#ffffff,stroke-width:2px

    A["Long band of research<br/>decades of theory and experiments"]:::old
    B["Chat era<br/>roughly 3 to 4 years"]:::new
    A ==>|"the idea reaches everyday users"| B
```

![ac51754e58fc6303afa661b24dd48d0b8c311b40db1fe5b39a436580fb03f66b](assets/ac51754e58fc6303afa661b24dd48d0b8c311b40db1fe5b39a436580fb03f66b.bin)

---

## What these models learned from

A language model learns from text, in enormous quantity. The material comes from the internet: articles, books, code, and nearly every other kind of written content.

A close everyday parallel is how a person learns their first language. Nobody hands a toddler a grammar textbook. The child listens to thousands of hours of speech, and patterns settle into place without anyone listing the rules. A language model goes through a similar process, only with written material, and at a scale no human could ever read.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#DBEAFE','primaryTextColor':'#0F172A','primaryBorderColor':'#2563EB','lineColor':'#2563EB','fontFamily':'Inter, sans-serif'}}}%%
flowchart LR
    classDef src fill:#F8FAFC,stroke:#94A3B8,color:#0F172A,stroke-width:1.5px
    classDef core fill:#2563EB,stroke:#1E3A8A,color:#ffffff,stroke-width:3px

    subgraph NET ["The internet"]
        direction TB
        T["📄 Web pages and text"]:::src
        A["📰 Articles"]:::src
        B["📚 Books"]:::src
        C["💻 Source code"]:::src
    end

    NET ==> M(("Model<br/>core")):::core
    style NET fill:#ffffff,stroke:#CBD5E1,stroke-dasharray: 5 5
```

This learning period is called **Training**. It happens once, over a fixed stretch of time, and then it stops. That detail turns out to matter a great deal.

---

## Training is slow and expensive, and that has a side effect

Training takes weeks to months. During that time, thousands of specialized graphics processors run continuously, and the computing cost is very high.

Think of a long-running, resource-heavy experiment. It cannot be repeated every week, because the equipment, the time, and the cost all get in the way. The companies that build these models face the same constraint. A new version of the model cannot be trained every day.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#DBEAFE','primaryTextColor':'#0F172A','primaryBorderColor':'#2563EB','lineColor':'#64748B','fontFamily':'Inter, sans-serif'}}}%%
flowchart LR
    classDef data fill:#F8FAFC,stroke:#94A3B8,color:#0F172A
    classDef train fill:#2563EB,stroke:#1E3A8A,color:#ffffff,stroke-width:2px
    classDef frozen fill:#0F172A,stroke:#0F172A,color:#ffffff
    classDef wall fill:#FEE2E2,stroke:#DC2626,color:#7F1D1D,stroke-width:3px

    D["Collected data"]:::data
    subgraph TR ["Training"]
        direction TB
        P["⏱ Weeks to months"]:::train
        Q["⚡ Very high compute cost"]:::train
    end
    F["Frozen model<br/>learning stops here"]:::frozen
    W["🚧 Cutoff date"]:::wall

    D ==> TR ==> F ==> W
    style TR fill:#EFF6FF,stroke:#2563EB
```

Because Training ends on a specific date, the model's knowledge ends there too.

---

## Knowledge Cutoff

Imagine an encyclopedia printed on a specific day and placed on a shelf. However thorough it is, it contains nothing about what happened the day after printing. The missing pages were never written.

Language models work the same way. Anything that occurred after the end of Training is unknown to the model, because it never saw any data from that period. This boundary is called the **Knowledge Cutoff**.

For example, if a model finished Training early last year, then recent events from the past several months are effectively invisible to it.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#DBEAFE','primaryTextColor':'#0F172A','primaryBorderColor':'#2563EB','lineColor':'#64748B','fontFamily':'Inter, sans-serif'}}}%%
flowchart LR
    classDef known fill:#DBEAFE,stroke:#2563EB,color:#0F172A
    classDef wall fill:#FEE2E2,stroke:#DC2626,color:#7F1D1D,stroke-width:3px
    classDef unknown fill:#F1F5F9,stroke:#CBD5E1,color:#94A3B8,stroke-dasharray: 4 4

    subgraph SEEN ["Everything the model saw"]
        direction LR
        K1["Older material"]:::known --> K2["More recent material"]:::known --> K3["End of Training"]:::known
    end
    K3 ==> W["⛔ Knowledge Cutoff"]:::wall ==> U["Later events<br/>never seen"]:::unknown
    style SEEN fill:#EFF6FF,stroke:#2563EB
```

### How web access changes the picture

If the model can search the live web, it can go and fetch what it never learned. It behaves like a person with a closed encyclopedia and an open browser: the book has no new pages, but the answer can still be found.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#DBEAFE','primaryTextColor':'#0F172A','primaryBorderColor':'#2563EB','lineColor':'#64748B','fontFamily':'Inter, sans-serif'}}}%%
flowchart TB
    classDef q fill:#F8FAFC,stroke:#94A3B8,color:#0F172A
    classDef stop fill:#FEE2E2,stroke:#DC2626,color:#7F1D1D,stroke-width:2px
    classDef go fill:#DCFCE7,stroke:#16A34A,color:#14532D,stroke-width:2px
    classDef wall fill:#FEE2E2,stroke:#DC2626,color:#7F1D1D,stroke-width:3px

    subgraph NOWEB ["Without web search"]
        direction LR
        a1["Question about a recent event"]:::q --> a2["⛔ Cutoff wall"]:::wall --> a3["Cannot answer reliably"]:::stop
    end
    subgraph WEB ["With web access"]
        direction LR
        b1["Question about a recent event"]:::q --> b2["🌐 Live search"]:::go --> b3["Fresh information brought across the wall"]:::go
    end
    style NOWEB fill:#FFF7F7,stroke:#FCA5A5
    style WEB fill:#F0FDF4,stroke:#86EFAC
```

This is why the Knowledge Cutoff is felt much less in current models than it used to be. One distinction is still worth holding on to: web access supplies **new information**, but the model's underlying knowledge and its command of language still come from the Training period.

![57d828c533066fe4065724668a156da54b5cbd7fe6e7cad35444be1ede585947](assets/57d828c533066fe4065724668a156da54b5cbd7fe6e7cad35444be1ede585947.bin)

---

## What a language model actually does

Underneath the fluent answers, a language model is a large **statistical system**. Given some text, it predicts the most likely continuation.

Everyone does a small version of this already. If someone begins a sentence with "The weather today is really ..." the mind immediately offers candidates such as "cold", "hot", or "nice". Words like "complicated" can technically fit, but they are far less probable, so they barely cross the mind.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#DBEAFE','primaryTextColor':'#0F172A','primaryBorderColor':'#2563EB','lineColor':'#64748B','fontFamily':'Inter, sans-serif'}}}%%
flowchart LR
    classDef input fill:#0F172A,stroke:#0F172A,color:#ffffff
    classDef hi fill:#2563EB,stroke:#1E3A8A,color:#ffffff,stroke-width:2px
    classDef mid fill:#93C5FD,stroke:#3B82F6,color:#0F172A
    classDef lo fill:#F1F5F9,stroke:#CBD5E1,color:#94A3B8

    S["The weather today is really ____"]:::input
    S ==>|"very likely"| W1["cold"]:::hi
    S ==>|"very likely"| W2["hot"]:::hi
    S -->|"plausible"| W3["nice"]:::mid
    S -.->|"unlikely"| W4["complicated"]:::lo
```

The model performs this same guess, at vastly greater scale, and then repeats it. It picks a word, appends it to the text, and uses the longer text to pick the next word. A full answer is produced by running this loop many times in a row.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#DBEAFE','primaryTextColor':'#0F172A','primaryBorderColor':'#2563EB','lineColor':'#2563EB','fontFamily':'Inter, sans-serif'}}}%%
stateDiagram-v2
    direction LR
    [*] --> CurrentText
    CurrentText: Text so far
    Predict: Weigh candidate next words
    Append: Add the most fitting word
    CurrentText --> Predict
    Predict --> Append
    Append --> CurrentText: keep going
    Append --> [*]: answer complete
```

The guesses rest on billions of internal numerical settings. During Training, those numbers were adjusted according to the patterns present in the data.

---

## From raw predictor to assistant

If the model only continues text, why does it answer questions instead of simply continuing them?

A raw text predictor given "What is the capital of France?" may produce more questions, such as "What is the capital of Germany? What is the capital of Spain?", because question lists like that are common in written material. Continuing the text is exactly what it was built to do.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#DBEAFE','primaryTextColor':'#0F172A','primaryBorderColor':'#2563EB','lineColor':'#64748B','actorBkg':'#F1F5F9','actorBorder':'#94A3B8','actorTextColor':'#0F172A','noteBkgColor':'#FEF9C3','noteBorderColor':'#CA8A04','fontFamily':'Inter, sans-serif'}}}%%
sequenceDiagram
    autonumber
    actor You
    participant Raw as Raw text predictor
    participant Asst as Assistant model

    rect rgb(241, 245, 249)
        You->>Raw: What is the capital of France?
        Raw-->>You: What is the capital of Germany? What is the capital of Spain? ...
        Note over Raw: Only continues the text
    end
    rect rgb(219, 234, 254)
        You->>Asst: What is the capital of France?
        Asst-->>You: Paris. Would you like a short overview of the city?
        Note over Asst: Recognizes a question and answers it
    end
```

The difference comes from the final phase of Training, which uses **real human conversations** and **human evaluation**. People read the model's answers and rate them, and the model learns which kinds of answers are more helpful, more accurate, and more polite.

An apprentice who has read widely but never worked with anyone offers a fair comparison. Later, working next to an experienced colleague and receiving feedback, the apprentice learns how to put that reading to use for the person asking. The knowledge was already there. The feedback stage shaped how it gets delivered.

![49619b2f64ec23f47f25ab2dd8d37f06fc013966a7b3558287668dca434b50de](assets/49619b2f64ec23f47f25ab2dd8d37f06fc013966a7b3558287668dca434b50de.bin)

---

## Patterns, not memory

A common assumption is that the model stores the text it saw, like a giant searchable database. That is not how it works.

The model did not memorize billions of sentences word for word. It extracted **patterns** from them: patterns of language, of grammar, and even of reasoning. These patterns are stored in its internal structure, a neural network, and not in an archive of documents that can be looked up.

The distinction is clearest with two exam candidates. One memorized the exact answers to every past exam. The other understood the underlying concepts. On a repeated question, both succeed. On a question nobody has asked before, the first gets stuck and the second works it out.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#DBEAFE','primaryTextColor':'#0F172A','primaryBorderColor':'#2563EB','lineColor':'#64748B','fontFamily':'Inter, sans-serif'}}}%%
flowchart LR
    classDef dull fill:#F1F5F9,stroke:#94A3B8,color:#475569
    classDef glow fill:#DBEAFE,stroke:#2563EB,color:#0F172A,stroke-width:2px
    classDef out1 fill:#E2E8F0,stroke:#94A3B8,color:#334155
    classDef out2 fill:#2563EB,stroke:#1E3A8A,color:#ffffff,stroke-width:2px

    subgraph MEM ["Memorizing"]
        direction LR
        m1["📚 Library of exact sentences"]:::dull --> m2["Can only repeat what it has seen"]:::out1
    end
    subgraph PAT ["Learning patterns"]
        direction LR
        p1["🕸 Network of patterns"]:::glow --> p2["Can assemble new combinations"]:::out2
    end
    style MEM fill:#FAFAFA,stroke:#CBD5E1
    style PAT fill:#EFF6FF,stroke:#2563EB
```

A person who has absorbed the rules of a language can produce a sentence nobody has ever said before, and still be perfectly understood. The same ability is what lets the model produce combinations that did not exist in its training material in exactly that form.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#DBEAFE','primaryTextColor':'#0F172A','primaryBorderColor':'#2563EB','lineColor':'#64748B','fontFamily':'Inter, sans-serif'}}}%%
mindmap
  root((Patterns extracted from text))
    Language
      How words sit next to each other
      How sentences are built
    Grammar
      Rules of writing and speaking
    Reasoning
      How one statement leads to the next
      How conclusions follow from premises
    Result
      New combinations
      Not just repetition
```

![a9d7fd3420c438f34fa920e26e04b5becd359fe9624a90877041559b2346de0a](assets/a9d7fd3420c438f34fa920e26e04b5becd359fe9624a90877041559b2346de0a.bin)

---

## Breadth over depth

The material the model learned from was gathered for **comprehensiveness**, not for specialist depth in any one area.

Consider a narrow, technical topic. Suppose a thousand careful scientific papers exist on it. Online, there is usually several times that volume of general, simplified, and sometimes outright wrong content about the same topic, spread across blogs, forums, and social media. The model saw all of it. Because its learning is driven by volume and frequency, it cannot automatically tell which source is more authoritative, unless it was specifically designed and trained to do so.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#DBEAFE','primaryTextColor':'#0F172A','primaryBorderColor':'#2563EB','lineColor':'#64748B','fontFamily':'Inter, sans-serif'}}}%%
flowchart TB
    classDef tip fill:#2563EB,stroke:#1E3A8A,color:#ffffff,stroke-width:2px
    classDef mid fill:#93C5FD,stroke:#3B82F6,color:#0F172A
    classDef base fill:#DBEAFE,stroke:#93C5FD,color:#0F172A

    T["Narrow tip<br/>expert papers"]:::tip
    M["Wider layer<br/>textbooks and tutorials"]:::mid
    B["Very wide base<br/>blogs, forums, social media, simple explanations"]:::base
    T --- M --- B
```

Picture learning what a dish tastes like by reading every opinion ever written about it. Most opinions come from ordinary diners, and a small fraction from professional chefs. The result is a broad and useful sense of the dish, but not the precision of a chef.

---

## The view from the research frontier

A researcher working at the edge of a field is often underwhelmed by these tools at first contact. The reason follows directly from how they are built. Someone pushing the boundary of knowledge expects a conversation partner operating at their own level of expertise, while the model was trained on material that **already exists**. The frontier is, by definition, where little has been written yet.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#DBEAFE','primaryTextColor':'#0F172A','primaryBorderColor':'#2563EB','lineColor':'#64748B','fontFamily':'Inter, sans-serif'}}}%%
flowchart LR
    classDef cover fill:#DBEAFE,stroke:#2563EB,color:#0F172A
    classDef line fill:#2563EB,stroke:#1E3A8A,color:#ffffff,stroke-width:3px
    classDef beyond fill:#0F172A,stroke:#0F172A,color:#ffffff
    classDef blank fill:#F8FAFC,stroke:#CBD5E1,color:#94A3B8,stroke-dasharray: 4 4

    subgraph COV ["Model coverage"]
        direction TB
        c1["Established knowledge"]:::cover
        c2["Well-documented methods"]:::cover
    end
    COV ==> L{{"Edge of knowledge"}}:::line
    L ==> R["🧭 Researcher steps past the line"]:::beyond
    R -.-> U["Little or nothing written yet"]:::blank
    style COV fill:#EFF6FF,stroke:#2563EB
```

It works like an explorer's map. The map is excellent for everything already charted, and blank beyond its edge. The same pattern shows up more generally: people who work deep inside one specialty tend to stay in their comfortable zone, and as a result they miss most of what the tool can do across the surrounding territory.

---

## The right mental model

Given all of the above, the most accurate framing is this. The tool is **not a peer-level colleague**. It is closer to an **undergraduate-level assistant with surface-level competence across nearly every field**: the breadth of all disciplines rather than the depth of one specialist.

```mermaid
%%{init: {'theme':'base','themeVariables':{'quadrant1Fill':'#DBEAFE','quadrant2Fill':'#EFF6FF','quadrant3Fill':'#F8FAFC','quadrant4Fill':'#F1F5F9','quadrantTitleFill':'#0F172A','quadrantPointFill':'#2563EB','quadrantPointTextFill':'#0F172A','quadrantXAxisTextFill':'#64748B','quadrantYAxisTextFill':'#64748B','quadrantInternalBorderStrokeFill':'#CBD5E1','quadrantExternalBorderStrokeFill':'#CBD5E1','fontFamily':'Inter, sans-serif'}}}%%
quadrantChart
    title Where the assistant sits compared with a specialist
    x-axis "Shallow in any one field" --> "Deep in one field"
    y-axis "Narrow coverage" --> "Broad coverage across fields"
    quadrant-1 "Rare: deep and broad"
    quadrant-2 "Broad undergraduate-level assistant"
    quadrant-3 "Beginner"
    quadrant-4 "Deep specialist"
    "AI model": [0.28, 0.90]
    "Field specialist": [0.92, 0.22]
```

| Peer-level colleague (wrong expectation) | Undergraduate-level assistant across all fields (accurate expectation) |
|---|---|
| Expected to match a specialist's analysis | Expected to know a lot, broadly, at a foundational level |
| Falls short, and the answers feel shallow | Useful for the supporting work around the specialist's own analysis |
| One person's depth in one area | Working knowledge of nearly every area at once |

An assistant like this will not replace a specialist's own analysis. What it can do is handle the surrounding, supporting tasks much faster than before, and that difference in how the tool is viewed is what determines how much value it delivers.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#DBEAFE','primaryTextColor':'#0F172A','primaryBorderColor':'#2563EB','lineColor':'#64748B','fontFamily':'Inter, sans-serif'}}}%%
flowchart LR
    classDef spec fill:#0F172A,stroke:#0F172A,color:#ffffff,stroke-width:2px
    classDef asst fill:#2563EB,stroke:#1E3A8A,color:#ffffff,stroke-width:2px
    classDef side fill:#DBEAFE,stroke:#2563EB,color:#0F172A

    S["🧠 Specialist<br/>deep analysis"]:::spec
    A["🤝 Broad assistant"]:::asst
    T1["Gathering background material"]:::side
    T2["Drafting and formatting"]:::side
    T3["Cross-field explanations"]:::side
    A --> T1
    A --> T2
    A --> T3
    T1 --> S
    T2 --> S
    T3 --> S
```

![b0c0023afd391554cf485cfef867f687eddaaadd24adb5c400e1c4b8b90c75f1](assets/b0c0023afd391554cf485cfef867f687eddaaadd24adb5c400e1c4b8b90c75f1.bin)
