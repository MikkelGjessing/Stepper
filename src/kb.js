// Knowledge Base Management
// Handles loading and accessing knowledge base articles

class KnowledgeBase {
  constructor() {
    this.articles = [];
  }

  loadArticles(articles) {
    this.articles = articles;
  }

  getArticle(id) {
    return this.articles.find(article => article.id === id);
  }

  getAllArticles() {
    return this.articles;
  }

  searchByKeywords(keywords) {
    return this.articles.filter(article => 
      keywords.some(keyword => 
        article.keywords && article.keywords.includes(keyword)
      )
    );
  }
}

export default KnowledgeBase;
