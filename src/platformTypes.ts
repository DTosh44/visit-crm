export type PlatformCollection = keyof PlatformData

export type MemberValueType='Website listing exposure'|'Campaign participation'|'Newsletter feature'|'Social promotion'|'PR/media opportunity'|'Travel trade opportunity'|'Familiarisation visit'|'Business event lead'|'Events/networking'|'Training'|'Research/data'|'Member offer'|'Membership benefit used'|'Other'
export interface MemberValueEntry { id:string; organisationId:string; campaignId?:string; opportunityId?:string; benefitId?:string; relatedId?:string; date:string; type?:MemberValueType; category:'Website'|'Marketing'|'PR'|'Travel trade'|'MICE'|'Engagement'; activity:string; quantity:number; estimatedValue:number; actualValue?:number; source?:string; calculation?:'automatic'|'manual'; notes?:string; evidence:string }
export interface MemberResource { id:string; title:string; category:string; description:string; url:string; membershipLevels:string[]; published:boolean; updatedAt:string }
export interface CommunicationTemplate { id:string; name:string; category:string; subject:string; previewText:string; body:string; senderName:string; replyTo?:string; ctaLabel?:string; ctaUrl?:string; updatedAt:string }
export interface ContactSegment { id:string; name:string; description:string; filters:Array<{field:string;operator:string;value:string}>; dynamic:boolean; contactIds?:string[]; updatedAt:string }
export type CommunicationType='Email campaign'|'Individual email'|'Member update'|'Newsletter'|'Renewal'|'Event / opportunity'
export type CommunicationStatus='Draft'|'Scheduled'|'Sending'|'Sent'|'Failed'
export type DeliveryStatus='Queued'|'Sent to provider'|'Delivered'|'Failed'|'Bounced'
export interface AudienceFilter { field:string; value:string }
export interface CommunicationAudience { filters:AudienceFilter[]; organisationIds:string[]; contactIds:string[]; mode:'all'|'selected' }
export interface CommunicationRecipient { contactId:string; organisationId?:string; email:string; status:DeliveryStatus; providerId?:string; sentAt?:string; deliveredAt?:string; opens:number; clicks:number; bouncedAt?:string; unsubscribedAt?:string; error?:string }
export interface CommunicationRecord { id:string; name:string; type?:CommunicationType; templateId?:string; segmentId?:string; contactId?:string; campaignId?:string; audience?:CommunicationAudience; subject:string; previewText?:string; fromName?:string; replyTo?:string; body:string; ctaLabel?:string; ctaUrl?:string; status:CommunicationStatus|'Queued'; recipientCount:number; recipients?:CommunicationRecipient[]; createdBy?:string; createdAt:string; scheduledAt?:string; sentAt?:string; error?:string; testSentAt?:string }
export interface CommunicationPreference { id:string; contactId:string; service:boolean; marketing:boolean; trade:boolean; businessEvents?:boolean; prMedia?:boolean; events:boolean; research:boolean; preferredEmail?:string; unsubscribed?:boolean; lawfulBasis:string; note:string }
export type AutomationTrigger = 'organisation_created'|'contact_created'|'lead_created'|'pipeline_stage_changed'|'membership_created'|'renewal_approaching'|'membership_expired'|'invoice_due'|'invoice_overdue'|'agreement_expiring'|'task_completed'|'event_created'|'opportunity_created'|'risk_changed'|'date_based'|'scheduled_recurring'
export type AutomationField = 'membership_tier'|'organisation_type'|'area'|'pipeline_stage'|'member_status'|'membership_status'|'satisfaction_status'|'tags'|'owner'|'invoice_status'|'renewal_date'|'last_engagement_date'|'contact_preference'
export interface AutomationCondition { field:AutomationField; operator:'equals'|'not_equals'|'contains'|'before'|'after'|'within_days'; value:string }
export type AutomationActionType = 'create_task'|'assign_task'|'queue_email'|'add_tag'|'remove_tag'|'update_field'|'change_pipeline_stage'|'update_member_status'|'create_reminder'|'add_to_campaign'|'add_to_audience'|'notify'|'add_activity'
export interface AutomationAction { type:AutomationActionType; value:string; field?:string }
export interface AutomationRule { id:string; name:string; description:string; trigger:AutomationTrigger; conditions:AutomationCondition[]; actions:AutomationAction[]; active:boolean; createdAt:string; owner:string; scheduleAt?:string; interval?:'daily'|'weekly'|'monthly'; lastRun?:string; nextRun?:string; runs:number; error?:string }
export interface AutomationRun { id:string; ruleId:string; ruleName:string; eventKey:string; trigger:AutomationTrigger; recordId:string; recordLabel:string; organisationId?:string; startedAt:string; status:'success'|'failed'|'skipped'; actions:string[]; error?:string }
export interface AutomationNotification { id:string; user:string; title:string; detail:string; createdAt:string; read:boolean }
export type CampaignStatus='Planning'|'Active'|'Paused'|'Completed'|'Cancelled'
export type CampaignType='Seasonal'|'Domestic leisure'|'International'|'Travel trade'|'Business events'|'Member/co-op'|'PR'|'Tactical'
export type CampaignMetric='website_visits'|'leads'|'bookings_referrals'|'impressions'|'reach'|'engagement'|'email_subscribers'|'campaign_partners'|'partner_investment'|'media_coverage'
export interface CampaignKpi {id:string;metric:CampaignMetric;target:number;actual:number;source:'manual'|'website'|'partners'|'communications'}
export interface CampaignPartner {organisationId:string;contribution:number;participationType:string;status:'Invited'|'Confirmed'|'Active'|'Completed'|'Declined';opportunityId?:string;notes:string}
export interface CampaignExpense {id:string;description:string;channel:string;planned:number;actual:number;date:string}
export interface CampaignAsset {id:string;title:string;type:'URL'|'Image'|'Listing'|'Event'|'Page';url:string;relatedId?:string;notes:string}
export interface CampaignActivity {id:string;at:string;actor:string;detail:string}
export interface CampaignChannelResult {channel:string;spend:number;impressions:number;reach:number;visits:number;leads:number;referrals:number;notes:string}
export interface Campaign { id:string; name:string; description?:string; type?:CampaignType; owner:string; status:CampaignStatus|'Complete'; startDate:string; endDate:string; objective:string; audience:string; markets:string[]; themes:string[]; channels:string[]; budget:number; actualSpend:number; organisationIds:string[]; listingIds:string[]; pageIds:string[]; eventIds?:string[]; impressions:number; reach:number; clicks:number; conversions:number; referrals:number; kpis?:CampaignKpi[]; partners?:CampaignPartner[]; expenses?:CampaignExpense[]; assets?:CampaignAsset[]; activity?:CampaignActivity[]; channelResults?:CampaignChannelResult[]; externalFunding?:number; partnerInvestment?:number; resultValue?:number; resultValueEvidence?:string; updatedAt?:string }
export type MemberOpportunityStatus='Draft'|'Open'|'Closed'|'In progress'|'Completed'|'Cancelled'
export type OpportunityApplicationStatus='Invited'|'Interested'|'Applied'|'Approved'|'Confirmed'|'Rejected'|'Declined'|'Waitlisted'|'Information requested'|'Withdrawn'
export interface OpportunityApplication {id:string;organisationId:string;contactId:string;response:string;listingId?:string;notes:string;status:OpportunityApplicationStatus;amount:number;createdAt?:string;updatedAt?:string;participated?:boolean;outcome?:string;valueDelivered?:number}
export interface MemberOpportunity { id:string; title:string; description:string; category:string; type?:string; owner?:string; eligibleLevels:string[]; eligibleGeographies?:string[]; eligibleCategories?:string[]; eligibilityCriteria?:string; requiresMembership?:boolean; invitationOnly?:boolean; invitedOrganisationIds?:string[]; capacity:number; price:number; subsidisedValue?:number; openingDate?:string; closingDate:string; activityStartDate?:string; activityEndDate?:string; campaignId?:string; requirements:string; links?:Array<{id:string;label:string;url:string}>; status:MemberOpportunityStatus; applications:OpportunityApplication[]; createdAt?:string; updatedAt?:string }
export type TradeType='Tour operator'|'DMC'|'OTA'|'Wholesaler'|'Travel agent'|'Coach operator'|'Trade association'|'Other distribution partner'
export type TradeLeadStage='New'|'Qualified'|'Shared'|'Responded'|'Converted'|'Lost'
export type TradeActivityType='Meeting'|'Trade show'|'Sales call'|'Email'|'Familiarisation visit'|'Product update'|'Introduction'|'Lead'|'Follow-up'
export interface TravelBuyer { id:string; organisationId?:string; contactId?:string; company:string; contact:string; country:string; market:string; type:string; sourceMarkets:string[]; segments:string[]; fitGroup:'FIT'|'Group'|'Both'; pricePosition?:'Luxury'|'Mid-market'|'Budget'|'Mixed'; interests:string[]; productIds?:string[]; relationshipStatus:string; priority:'High'|'Medium'|'Low'; lastContacted:string; nextAction:string; owner:string; notes:string; tags:string[] }
export interface TradeLeadDistribution {organisationId:string;sharedAt:string;response:'Awaiting'|'Interested'|'Declined'|'Proposal'|'Converted';respondedAt?:string;notes:string}
export interface TradeLead { id:string; buyerId:string; description:string; dates:string; partySize:number; markets:string[]; interests:string[]; organisationIds:string[]; estimatedValue:number; actualValue?:number; stage:TradeLeadStage|'Shared with members'|'Proposal'|'Won'; owner:string; nextAction:string; outcome:string; distributions?:TradeLeadDistribution[]; convertedAt?:string; createdAt?:string; showId?:string; memberOpportunityId?:string }
export interface TradeShow { id:string; name:string; location:string; startDate:string; endDate:string; cost:number; attendees:string[]; contactIds?:string[]; buyerIds?:string[]; organisationIds:string[]; appointments:number; qualifiedBuyers:number; leads:number; followUps:number; estimatedPipeline:number; notes:string; outcome?:string; taskIds?:string[]; memberOpportunityId?:string }
export interface FamTrip { id:string; title:string; startDate:string; endDate:string; targetMarket:string; buyerIds:string[]; mediaProfileIds?:string[]; organisationIds:string[]; listingIds:string[]; itinerary:string; dietary:string; accessibility:string; cost:number; notes?:string; outcome?:string; feedback:string; followUp:string; memberOpportunityId?:string }
export interface TradeActivity {id:string;date:string;type:TradeActivityType;buyerId?:string;organisationId?:string;contactId?:string;showId?:string;leadId?:string;famTripId?:string;title:string;detail:string;outcome?:string;owner:string}
export interface VenueCapability { id:string; listingId:string; maxDelegates:number; theatre:number; classroom:number; boardroom:number; banquet:number; reception:number; bedrooms:number; breakoutRooms:number; parking:boolean; accessibility:string; catering:boolean; av:boolean; wifi:boolean; sustainability:string }
export type BusinessBuyerType='Corporate'|'Agency'|'Association'|'Professional conference organiser'|'Event planner'|'Incentive planner'|'Venue finder'
export interface BusinessBuyer {id:string;organisationId:string;contactIds:string[];type:BusinessBuyerType;markets:string[];eventTypes:string[];typicalDelegates:number;venueRequirements:string;accommodationRequirements:string;owner:string;relationshipStatus:'New'|'Developing'|'Active'|'Dormant';lastContact:string;nextAction:string;notes:string}
export type BusinessEnquiryStage='New'|'Qualifying'|'Venue matching'|'Shared with partners'|'Proposal'|'Decision pending'|'Won'|'Lost'
export interface BusinessDistribution {organisationId:string;listingId?:string;sharedAt:string;response:'Awaiting'|'Interested'|'Declined'|'Proposal submitted';availability:string;proposalStatus:string;notes:string;respondedAt?:string}
export interface BusinessEnquiry { id:string; buyerId?:string;organisationId?:string;contactId?:string;client:string;organisation:string;contact:string;name?:string;eventType:string;eventStartDate?:string;eventEndDate?:string;flexibleDates?:boolean;preferredDates:string;delegates:number;roomNights:number;bedrooms:number;requirements:string;meetingRequirements?:string;cateringRequirements?:string;accessibilityRequirements?:string;budget:number;budgetKnown?:boolean;location:string;source:string;economicValue:number;economicImpactEstimate?:number;eventValue?:number;delegateNights?:number;stage:BusinessEnquiryStage|'Matching venues'|'Issued'|'Responses received';owner:string;nextAction:string;invitedVenueIds:string[];accommodationListingIds?:string[];distributions?:BusinessDistribution[];responses:Array<{venueId:string;status:'Interested'|'Not suitable';availability:string;rate:number;notes:string}>;winningVenueId?:string;wonAt?:string;lostReason?:string;notes?:string;createdAt?:string;memberOpportunityId?:string }
export interface BusinessShowcase {id:string;name:string;startDate:string;endDate:string;market:string;buyerIds:string[];contactIds:string[];organisationIds:string[];listingIds:string[];itinerary:string;cost:number;notes:string;followUp:string;outcome:string;memberOpportunityId?:string}
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
  automationRuns:AutomationRun[]
  automationNotifications:AutomationNotification[]
  campaigns:Campaign[]
  memberOpportunities:MemberOpportunity[]
  travelBuyers:TravelBuyer[]
  tradeLeads:TradeLead[]
  tradeShows:TradeShow[]
  tradeActivities:TradeActivity[]
  famTrips:FamTrip[]
  venueCapabilities:VenueCapability[]
  businessBuyers:BusinessBuyer[]
  businessEnquiries:BusinessEnquiry[]
  businessShowcases:BusinessShowcase[]
  mediaProfiles:MediaProfile[]
  prOpportunities:PROpportunity[]
  mediaCoverage:MediaCoverage[]
  surveys:Survey[]
  surveyResponses:SurveyResponse[]
  healthIssues:WebsiteHealthIssue[]
  engagementSettings:EngagementSettings
}
