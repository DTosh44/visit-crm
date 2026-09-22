export type PlatformCollection = keyof PlatformData

export interface MemberValueEntry { id:string; organisationId:string; date:string; category:'Website'|'Marketing'|'PR'|'Travel trade'|'MICE'|'Engagement'; activity:string; quantity:number; estimatedValue:number; evidence:string }
export interface MemberResource { id:string; title:string; category:string; description:string; url:string; membershipLevels:string[]; published:boolean; updatedAt:string }
export interface CommunicationTemplate { id:string; name:string; category:string; subject:string; previewText:string; body:string; senderName:string; updatedAt:string }
export interface ContactSegment { id:string; name:string; description:string; filters:Array<{field:string;operator:string;value:string}>; dynamic:boolean; updatedAt:string }
export interface CommunicationRecord { id:string; name:string; templateId?:string; segmentId?:string; subject:string; body:string; status:'Draft'|'Queued'|'Sent'; recipientCount:number; createdAt:string; sentAt?:string }
export interface CommunicationPreference { id:string; contactId:string; service:boolean; marketing:boolean; trade:boolean; events:boolean; research:boolean; lawfulBasis:string; note:string }
export interface AutomationCondition { field:string; operator:string; value:string }
export interface AutomationAction { type:'create_task'|'queue_email'|'add_activity'|'add_tag'|'notify'; value:string }
export interface AutomationRule { id:string; name:string; description:string; trigger:string; conditions:AutomationCondition[]; actions:AutomationAction[]; active:boolean; lastRun?:string; runs:number; error?:string }
export interface Campaign { id:string; name:string; owner:string; status:'Planning'|'Active'|'Complete'|'Paused'; startDate:string; endDate:string; objective:string; audience:string; markets:string[]; themes:string[]; channels:string[]; budget:number; actualSpend:number; organisationIds:string[]; listingIds:string[]; pageIds:string[]; impressions:number; reach:number; clicks:number; conversions:number; referrals:number }
export interface MemberOpportunity { id:string; title:string; description:string; category:string; eligibleLevels:string[]; capacity:number; price:number; closingDate:string; campaignId?:string; requirements:string; status:'Draft'|'Open'|'Closed'; applications:Array<{id:string;organisationId:string;contactId:string;response:string;listingId?:string;notes:string;status:'Applied'|'Approved'|'Declined'|'Waitlisted'|'Information requested';amount:number}> }
export interface TravelBuyer { id:string; organisationId?:string; contactId?:string; company:string; contact:string; country:string; market:string; type:string; sourceMarkets:string[]; segments:string[]; fitGroup:'FIT'|'Group'|'Both'; interests:string[]; relationshipStatus:string; priority:'High'|'Medium'|'Low'; lastContacted:string; nextAction:string; owner:string; notes:string; tags:string[] }
export interface TradeLead { id:string; buyerId:string; description:string; dates:string; partySize:number; markets:string[]; interests:string[]; organisationIds:string[]; estimatedValue:number; stage:'New'|'Qualified'|'Shared with members'|'Proposal'|'Won'|'Lost'; owner:string; nextAction:string; outcome:string }
export interface TradeShow { id:string; name:string; location:string; startDate:string; endDate:string; cost:number; attendees:string[]; organisationIds:string[]; appointments:number; qualifiedBuyers:number; leads:number; followUps:number; estimatedPipeline:number; notes:string }
export interface FamTrip { id:string; title:string; startDate:string; endDate:string; targetMarket:string; buyerIds:string[]; organisationIds:string[]; listingIds:string[]; itinerary:string; dietary:string; accessibility:string; cost:number; feedback:string; followUp:string }
export interface VenueCapability { id:string; listingId:string; maxDelegates:number; theatre:number; classroom:number; boardroom:number; banquet:number; reception:number; bedrooms:number; breakoutRooms:number; parking:boolean; accessibility:string; catering:boolean; av:boolean; wifi:boolean; sustainability:string }
export interface BusinessEnquiry { id:string; client:string; organisation:string; contact:string; eventType:string; preferredDates:string; delegates:number; roomNights:number; bedrooms:number; requirements:string; budget:number; location:string; source:string; economicValue:number; stage:'New'|'Matching venues'|'Issued'|'Responses received'|'Won'|'Lost'; owner:string; nextAction:string; invitedVenueIds:string[]; responses:Array<{venueId:string;status:'Interested'|'Not suitable';availability:string;rate:number;notes:string}>; winningVenueId?:string }
export interface MediaProfile { id:string; contactId?:string; name:string; outlet:string; type:string; country:string; topics:string[]; audience:number; relationshipStatus:string; preference:string; lastContact:string; notes:string; tags:string[] }
export interface PROpportunity { id:string; title:string; mediaProfileId:string; publication:string; deadline:string; request:string; organisationIds:string[]; responseSent:boolean; outcome:string; owner:string }
export interface MediaCoverage { id:string; outlet:string; journalist:string; title:string; publicationDate:string; url:string; mediaType:string; topics:string[]; organisationIds:string[]; audience:number; sentiment:'Positive'|'Neutral'|'Negative'; estimatedValue:number; notes:string }
export interface SurveyQuestion { id:string; label:string; type:'short_text'|'long_text'|'single_choice'|'multiple_choice'|'dropdown'|'rating'|'nps'|'number'|'date'|'yes_no'; required:boolean; options:string[] }
export interface Survey { id:string; title:string; introduction:string; status:'Draft'|'Open'|'Closed'; openingDate:string; closingDate:string; anonymous:boolean; audience:string; segmentId?:string; slug:string; thankYou:string; questions:SurveyQuestion[] }
export interface SurveyResponse { id:string; surveyId:string; organisationId?:string; contactId?:string; submittedAt:string; answers:Record<string,string|string[]|number> }
export interface WebsiteHealthIssue { id:string; area:'Accessibility'|'SEO'|'Content'; severity:'Critical'|'High'|'Medium'|'Low'; title:string; description:string; entityType:'Page'|'Listing'|'Event'|'Image'|'Site'; entityId?:string; route:string; resolved:boolean; check:string }
export interface EngagementSettings { weights:Record<string,number>; riskDays:number; completenessThreshold:number }

export interface PlatformData {
  memberValue:MemberValueEntry[]
  resources:MemberResource[]
  communicationTemplates:CommunicationTemplate[]
  segments:ContactSegment[]
  communications:CommunicationRecord[]
  communicationPreferences:CommunicationPreference[]
  automations:AutomationRule[]
  campaigns:Campaign[]
  memberOpportunities:MemberOpportunity[]
  travelBuyers:TravelBuyer[]
  tradeLeads:TradeLead[]
  tradeShows:TradeShow[]
  famTrips:FamTrip[]
  venueCapabilities:VenueCapability[]
  businessEnquiries:BusinessEnquiry[]
  mediaProfiles:MediaProfile[]
  prOpportunities:PROpportunity[]
  mediaCoverage:MediaCoverage[]
  surveys:Survey[]
  surveyResponses:SurveyResponse[]
  healthIssues:WebsiteHealthIssue[]
  engagementSettings:EngagementSettings
}
