/**
 * Empire System v1.5.0
 * Section 2: The Factory - Content Generation
 * 
 * Listing Description Generator Node
 * 
 * This node generates compelling, professional real estate listing descriptions
 * using AI. It takes property details and creates optimized marketing copy
 * that highlights key features and appeals to potential buyers.
 */

const axios = require('axios');
const logger = require('../utils/logger');

class ListingDescriptionGenerator {
  constructor() {
    this.nodeId = 'listing-description-generator';
    this.nodeName = 'Listing Description Generator';
    this.section = 'Section 2: The Factory';
    this.version = '1.5.0';
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * Initialize the node
   */
  async initialize() {
    logger.info(`[${this.nodeId}] Initializing ${this.nodeName}...`);
    
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    logger.info(`[${this.nodeId}] ✅ ${this.nodeName} initialized successfully`);
    return true;
  }

  /**
   * Generate a compelling listing description
   * 
   * @param {Object} propertyData - Property details
   * @param {string} propertyData.address - Property address
   * @param {number} propertyData.price - Listing price
   * @param {number} propertyData.bedrooms - Number of bedrooms
   * @param {number} propertyData.bathrooms - Number of bathrooms
   * @param {number} propertyData.sqft - Square footage
   * @param {string} propertyData.propertyType - Type of property (house, condo, etc.)
   * @param {Array<string>} propertyData.features - Key features and amenities
   * @param {string} propertyData.neighborhood - Neighborhood name
   * @param {Object} options - Generation options
   * @param {string} options.tone - Tone of the description (professional, luxury, casual)
   * @param {number} options.maxLength - Maximum length in words
   * @param {boolean} options.includeSEO - Include SEO keywords
   * @returns {Object} Generated description and metadata
   */
  async generateDescription(propertyData, options = {}) {
    try {
      logger.info(`[${this.nodeId}] Generating description for ${propertyData.address}`);

      // Set default options
      const tone = options.tone || 'professional';
      const maxLength = options.maxLength || 200;
      const includeSEO = options.includeSEO !== false;

      // Build the AI prompt
      const prompt = this._buildPrompt(propertyData, { tone, maxLength, includeSEO });

      // Call OpenAI API
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert real estate copywriter specializing in creating compelling property listings that attract buyers and generate leads. You write clear, engaging descriptions that highlight key features and create emotional connections.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const generatedDescription = response.data.choices[0].message.content.trim();

      // Extract sections if the response includes them
      const sections = this._parseDescription(generatedDescription);

      const result = {
        success: true,
        propertyAddress: propertyData.address,
        description: sections.main || generatedDescription,
        headline: sections.headline || this._generateHeadline(propertyData),
        highlights: sections.highlights || this._extractHighlights(propertyData),
        seoKeywords: includeSEO ? this._generateSEOKeywords(propertyData) : [],
        metadata: {
          generatedAt: new Date().toISOString(),
          wordCount: generatedDescription.split(' ').length,
          tone: tone,
          nodeId: this.nodeId,
          nodeVersion: this.version
        }
      };

      logger.info(`[${this.nodeId}] ✅ Description generated successfully (${result.metadata.wordCount} words)`);
      
      return result;

    } catch (error) {
      logger.error(`[${this.nodeId}] ❌ Error generating description:`, error.message);
      
      return {
        success: false,
        error: error.message,
        propertyAddress: propertyData.address,
        metadata: {
          generatedAt: new Date().toISOString(),
          nodeId: this.nodeId,
          nodeVersion: this.version
        }
      };
    }
  }

  /**
   * Build the AI prompt based on property data and options
   * @private
   */
  _buildPrompt(propertyData, options) {
    const { address, price, bedrooms, bathrooms, sqft, propertyType, features, neighborhood } = propertyData;
    const { tone, maxLength, includeSEO } = options;

    let prompt = `Write a compelling real estate listing description for the following property:\n\n`;
    prompt += `Address: ${address}\n`;
    prompt += `Price: $${price.toLocaleString()}\n`;
    prompt += `Property Type: ${propertyType}\n`;
    prompt += `Bedrooms: ${bedrooms}\n`;
    prompt += `Bathrooms: ${bathrooms}\n`;
    prompt += `Square Footage: ${sqft.toLocaleString()} sq ft\n`;
    
    if (neighborhood) {
      prompt += `Neighborhood: ${neighborhood}\n`;
    }
    
    if (features && features.length > 0) {
      prompt += `Key Features: ${features.join(', ')}\n`;
    }

    prompt += `\nRequirements:\n`;
    prompt += `- Tone: ${tone}\n`;
    prompt += `- Maximum length: ${maxLength} words\n`;
    prompt += `- Focus on benefits and lifestyle, not just features\n`;
    prompt += `- Create emotional appeal and urgency\n`;
    prompt += `- Highlight what makes this property special\n`;
    
    if (includeSEO) {
      prompt += `- Include relevant keywords for Loveland, Colorado real estate\n`;
    }

    prompt += `\nFormat the response as:\n`;
    prompt += `HEADLINE: [Catchy headline]\n`;
    prompt += `DESCRIPTION: [Main description]\n`;
    prompt += `HIGHLIGHTS: [3-5 bullet points of key features]\n`;

    return prompt;
  }

  /**
   * Parse the AI response into sections
   * @private
   */
  _parseDescription(text) {
    const sections = {
      headline: '',
      main: '',
      highlights: []
    };

    const headlineMatch = text.match(/HEADLINE:\s*(.+?)(?:\n|$)/i);
    if (headlineMatch) {
      sections.headline = headlineMatch[1].trim();
    }

    const descriptionMatch = text.match(/DESCRIPTION:\s*(.+?)(?=HIGHLIGHTS:|$)/is);
    if (descriptionMatch) {
      sections.main = descriptionMatch[1].trim();
    }

    const highlightsMatch = text.match(/HIGHLIGHTS:\s*(.+?)$/is);
    if (highlightsMatch) {
      const highlightText = highlightsMatch[1].trim();
      sections.highlights = highlightText
        .split('\n')
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(line => line.length > 0);
    }

    // If parsing failed, return the whole text as main description
    if (!sections.main) {
      sections.main = text;
    }

    return sections;
  }

  /**
   * Generate a headline from property data
   * @private
   */
  _generateHeadline(propertyData) {
    const { bedrooms, bathrooms, propertyType, neighborhood } = propertyData;
    return `Stunning ${bedrooms} Bed, ${bathrooms} Bath ${propertyType} in ${neighborhood || 'Loveland'}`;
  }

  /**
   * Extract key highlights from property data
   * @private
   */
  _extractHighlights(propertyData) {
    const highlights = [];
    
    if (propertyData.bedrooms && propertyData.bathrooms) {
      highlights.push(`${propertyData.bedrooms} bedrooms, ${propertyData.bathrooms} bathrooms`);
    }
    
    if (propertyData.sqft) {
      highlights.push(`${propertyData.sqft.toLocaleString()} square feet`);
    }
    
    if (propertyData.features && propertyData.features.length > 0) {
      highlights.push(...propertyData.features.slice(0, 3));
    }
    
    return highlights;
  }

  /**
   * Generate SEO keywords for the property
   * @private
   */
  _generateSEOKeywords(propertyData) {
    const keywords = [
      'Loveland Colorado real estate',
      'Loveland homes for sale',
      propertyData.neighborhood ? `${propertyData.neighborhood} homes` : null,
      `${propertyData.bedrooms} bedroom home Loveland`,
      propertyData.propertyType ? `${propertyData.propertyType} for sale Loveland` : null
    ].filter(Boolean);

    return keywords;
  }

  /**
   * Get node information
   */
  getInfo() {
    return {
      nodeId: this.nodeId,
      nodeName: this.nodeName,
      section: this.section,
      version: this.version,
      description: 'Generates compelling real estate listing descriptions using AI',
      capabilities: [
        'AI-powered description generation',
        'Multiple tone options (professional, luxury, casual)',
        'SEO keyword optimization',
        'Customizable length and style',
        'Automatic headline generation',
        'Key highlights extraction'
      ]
    };
  }
}

module.exports = { ListingDescriptionGenerator };
