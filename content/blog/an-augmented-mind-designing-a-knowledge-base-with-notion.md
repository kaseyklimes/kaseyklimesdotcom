---
title: "An Augmented Mind: Designing a Knowledge Base with Notion"
category: blog
date: 10-16-2019
stars: 2
span: 9
tags: ["blog"]
description: In 1945 Vannevar Bush proposed the Memex, a machine that would provide an "enlarged intimate supplement to one's memory" by compressing and storing all of on...
heroImage: /images/memex.jpg
---

# An Augmented Mind: Designing a Knowledge Base with Notion
![](/images/memex-1.jpg)
In 1945 Vannevar Bush proposed the Memex, a machine that would provide an "enlarged intimate supplement to one's memory" by compressing and storing all of one's books and records. Fast and flexible recall of information would be assisted by the interconnection of "associative trails". In effect, the organization of information in the machine would reflect the associative patterns of our own thought. As Bush argued,

_"The human mind... operates by association. With one item in its grasp, it snaps instantly to the next that is suggested by the association of thoughts, in accordance with some intricate web of trails carried by the cells of the brain. It has other characteristics, of course; trails that are not frequently followed are prone to fade, items are not fully permanent, memory is transitory. Yet the speed of action, the intricacy of trails, the detail of mental pictures, is awe-inspiring beyond all else in nature."_

Despite the 75 years and countless innovations we've had since Bush's call, most information systems still don't reflect the mind's associative process. They enforce rigidly hierarchical information architectures, only support one-way links, and completely ignore the importance of the relationships _between_ pieces of information. We are up to our necks in note-taking tools, but we lack _thinking tools_ that help us make sense of that information.

As a researcher I find this especially frustrating. The tools at our disposal for making sense of avalanches of information are disappointing at best. Fortunately, Notion has come along and built a tool that enables some degree of thinking in the spirit of Bush's Memex.

[This Notion block](https://kaseyklimes.gumroad.com/l/notion-knowledge-base) contains a template of my personal knowledge base. I think of it as a flexible framework for structuring insights into a network that allows me to easily explore the relationships between them and ultimately synthesize them into new ideas or a better understanding of the world. I consider it a secret weapon (that everyone should have)!

# Why Notion?

Notion has a few unique capabilities that make it extremely well-suited for a knowledge base.

## Two-Way Links
![](/images/two-way-links-01-01.png)
&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;_A mind produces a resource, a resource is produced by a mind__

My knowledge base takes advantage of Notion's relational database functionality, which is super handy for knowledge bases because it reflects a basic characteristic of information that most other systems ignore:

> 
### _If_**_A_**_is related to_**_B_**_, then_**_B_**_is also related to_**_A_**_._

### _If_**_A_**_is related to_**_B_**_, then_**_B_**_is also related to_**_A_**_._

---

Ted Nelson saw [the power of two-way links](https://en.wikipedia.org/wiki/Project_Xanadu) in the 60's but his vision was eclipsed by Tim Berners Lee's World Wide Web of one-way links.

For example, I have a table for Minds (writers, thinkers, etc.), and a table for Resources (books, articles, podcasts, etc). In the Minds table we may have Christopher Alexander, who wrote _A Pattern Language_, which appears in the Resources table. If we list _A Pattern Language_ as a resource related to Christopher Alexander in the Minds table, then Christopher Alexander will simultaneously appear as a mind related to _A Pattern Language_ in the Resources table. Two-way links are the perfect default in a knowledge base because relationships between information are inherently reciprocal.

##  Many-to-Many Relationships
![](/images/many-to-many-01-01.png)
&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;_An author may write many books. A book may have many authors.__

An author may write many books. A book may have many authors.

Furthermore, [most information does not actually conform well to hierarchical tree-like structures](http://en.bp.ntu.edu.tw/wp-content/uploads/2011/12/06-Alexander-A-city-is-not-a-tree.pdfhttp://en.bp.ntu.edu.tw/wp-content/uploads/2011/12/06-Alexander-A-city-is-not-a-tree.pdf). There can be relationships all over the place.

> 
### **_A_**_can be related to_**_B_**_and_**_C_**_, and_**_C_**_can be related to_**_A_**_and_**_D_**_._

### **_A_**_can be related to_**_B_**_and_**_C_**_, and_**_C_**_can be related to_**_A_**_and_**_D_**_._

Since Notion databases allow for multiple blocks within a single cell, we can create many-to-many relations. Christopher Alexander also wrote _The Timeless Way of Building_, and _Notes on the Synthesis of Form_.  Each of those books appears as a block _inside the single cell_ that contains all the resources related to Christopher Alexander. Conversely, _A Pattern Language_ was co-authored by Sara Ishikawa and Murray Silverstein, so they may each appear as blocks inside the single cell that contains all minds related to _A Pattern Language_. These many-to-many two-way links form the basic relationships for all information in the knowledge base.

# How It's Structured
![](/images/structure-03-03-03-03.png)
&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;_Every table is linked to all the other tables.__

These many-to-many two-way links govern the relationships of information across five tables.

## [Minds](https://www.notion.so/fd249064dadb4d5882af399a3804199b)

This is a table of individuals who have generated important knowledge. Most in my knowledge base are authors, but some are practitioners, speakers, and a few of my most insightful friends.

## [Resources](https://www.notion.so/ef6ef6dd52604a1f83db3131cf5a7586)

This is a table of books, blog posts, podcasts, videos, images and more that serve as primary resources for my note-taking. My [Notion web clipper](https://www.notion.so/web-clipper) defaults to dumping content from the internet into this table.

## [Insights](https://www.notion.so/019b5136d07d4a7b9319654320b48dc9)

This is a table of distilled insights, a term I use loosely to describe anything that gives me an "aha!" moment. It may be a statistic, a historical fact, an explanation of a useful concept, an aphorism, a provocative question, a scientific or philosophical theory, whatever. It's a unit of knowledge or wisdom, and the block usually contains an expansion on the insight.

## [Synthesis](https://www.notion.so/7ee60074b1ab4086975ae060f5596a7f)

This is a table of my own in-progress writing. It's where insights come together to form (hopefully) new perspectives.

## [Tags](https://www.notion.so/024d79af118b48d3a13e0b69d0abb78c)

This is a table of topics/subjects, e.g. "Augmented Reality", "Complexity Theory", "Cities".

Each table has a primary column for its main attribute followed by four more columns for attributes linking it to the four other tables. If it were visualized graphically (more on that in a moment) it would look like a crazy web, but in the tables it's all quite neat and tidy.

# Why It Works

A few things happen when information is structured like this.

First, patterns emerge. From the Tags table I can easily see all the insights related to a given tag. This often means I can see a new insight next to a topically-related insight I captured months ago and forgot about, but that now projects a new meaning when considered in juxtaposition with the new insight. The natural bundling of topically-connected insights sets me up for seeing connections between concepts I may have otherwise missed.

It turns out this is a fantastic way to practically auto-generate concepts for new ideas (which of course produces new blocks of writing in Synthesis related to those previously isolated insights). Sometimes I don't even start with writing; I simply create a new block in Synthesis and link a bundle of insights and resources to it that will form the basis of an article to write later.

> 
“There may be millions of fine thoughts, and the account of the experience on which they are based, all encased within stone walls of acceptable architectural form; but if the scholar can get at only one a week by diligent search, his syntheses are not likely to keep up with the current scene.”

Second, basic retrieval of information becomes easier. I have terrible memory, but I have to remember _something_ to retrieve a piece of information from the knowledge base – the interconnected tables provide multiple paths to get there.

For example, it frequently happens that I have only a vague recollection of an insight relevant to something else I'm studying. Perhaps I recall it was a theory that explained the systemic advantage of democratic decision-making, but I can't recall the name or anything else about it. None of my search-queries are finding it. However, it was an insight about political philosophy – so I need only look at the insights related to "Political Philosophy" in the Tags table to find it! Alternatively, if I only remember that it was a theory by Marquis de Condorcet, I can look under the insights related to him in the Minds table. (Ah, yes, the Jury Theorem!) Many relations across tables reduce the chances of a relevant insight becoming buried in the knowledge base. If you've ever experienced the magic of looking up an esoteric library book only to find a dozen related titles next to it on the shelf then you understand the value of this proximity.

Third, this system basically auto-generates summaries of every book I read. If I want to refresh my memory of Juhani Pallasmaa's _Eyes of The Skin,_ all I need to do is go to that book in my Resources table and review all the important insights I extracted from that text. I keep photos of the original book pages inside the insight block so that I can go back to the exact page an insight came from and review the original context if I want to go deeper.
![](/images/procedural-02-02-02.png)
&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;_We could think about the tables as a sequence from minds to the resources they create, to the insights we extract, to the synthesis they produce.__

# What's Missing

This is not, however, a perfect system. There's some yet-to-be developed functionality I think my knowledge base system really needs to reach its full potential.

## Automatic Second-Order Relations

Links don't currently proliferate through the entire knowledge base:

> 
### _If_**_A_**_is related to_**_B_**_and_**_B_**_is related to_**_C_**_, then A and B have a first-order relation while_**_A_**_and_**_C_**_would have_**_a_**_second-order relation._

### _If_**_A_**_is related to_**_B_**_and_**_B_**_is related to_**_C_**_, then A and B have a first-order relation while_**_A_**_and_**_C_**_would have_**_a_**_second-order relation._

There is currently no ability to automatically generate that second-order relation in the same stroke as the first-order relation. It must be done manually. This creates some overhead, though I find it worthwhile.
![](/images/structure-03-03-03.png)
&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;_If links to other tables are made from the Synthesis table (as in Example #1), then second-order links must still be created between the other tables.__

I've made this visible with Example #1 as shown in the template. I linked Synthesis Example #1 to Insight Example #1, Resources Example #1, Minds Example #1, and Tags Example #1 all from the Synthesis table. That means that in each of the other tables you will see the relation back to Synthesis Example #1, but you will not see Resources Example #1 in the Insights table, or Minds Example #1 in the Tags table. In order to have Example #1 proliferate completely throughout the knowledge base I have to go through each table and manually link the remainder of the attributes (as I have done with the Example #2 set).

Why does this matter? Well, one obvious reason is simply more efficient maintenance of the knowledge base. As it is, my knowledge base is perpetually incomplete.

The second, less obvious reason is that automatically generating second-order relations creates more opportunity for emergent relationships to appear. Second-order relations are inherently less obvious that first order relations, meaning that the automatic juxtaposition of insights with second order relations holds even more potential for big "aha!" moments. A good thinking tool puts non-obvious concepts in conversation with one another, and forces the user to consider their relationship.

## Graphical Information Mapping
![](/images/graphical-04.png)
&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;_Visualizing relationships can make abstract relationships more legible__

As I've pointed out, the real strength of this system is that it allows non-obvious relationships between information to emerge so that my brain can more easily connect the dots. Again, it’s not just a note-taking tool, it’s a thinking tool. Today, it does that better than any other system, but I am very much a visual thinker.

_Actually seeing_ the relationships across units of information would provide a whole new way for patterns to emerge.

What if I could visualize my knowledge base as a [network graph](http://www.wikiwebapp.com/)? Perhaps I'd see relationships I may otherwise miss, or perhaps an unexpected cluster of insights could direct my attention to something important emerging in my research. I've always wanted a personal knowledge base that represents and embeds information in the way [GIS](https://en.wikipedia.org/wiki/Geographic_information_system) does, because [our brains really like spatial metaphors](https://www.quantamagazine.org/the-brain-maps-out-ideas-and-memories-like-spaces-20190114/). What does the city of economics look like, and where are the roads to the city of psychology? Where does the neighborhood of Keynesianism fit in relation to the neighborhood of Hayek? Hey wait how did Daniel Kahneman get here? (You get the idea). Different views of the same information provide new ways of seeing.

# Conclusion

Notion is great at providing different views for the same set of information, so I could see graphical information mapping as a future development. Second-order relationships may be a bit obscure (and complex) to develop for the average user, but perhaps the forthcoming API will make it possible with some tooling. I have a deep admiration of Notion for staying true to the principles that made this system possible for me. They even have a commissioned portrait of Doug Engelbart in their office!

Overall I find this system to be a massive evolutionary leap from my old messy systems of text file notes in rigid hierarchical file structures with one-way links. I think Vannevar Bush would agree. If you're looking for an effective knowledge base system, duplicate [this template](https://kaseyklimes.gumroad.com/l/notion-knowledge-base) to your Notion workspace and give it a spin! I hope it can be useful to you as well.