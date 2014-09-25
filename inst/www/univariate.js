//UnivariateTable: name, slider, levels of comfort, crossover point
//model: ranges, equations, scens, selected_var1, univariate_crossover

var UnivariateTable = Backbone.View.extend({
    initialize: function(args,output){
		this.output=args.output;
		
		this.uniSliders=new RangeSliders({model:this.model,el:this.$el,editRange:editRange_placeholder});
		//uniSliders will be updated on render here instead
		this.uniSliders.stopListening();
		
		this.listenTo(this.model,'change:ranges', this.calc, this);
		this.listenTo(this.model,'change:equations', this.calc, this);
		this.listenTo(this.model,'change:scens',this.calc,this);
		this.listenTo(this.model,'change:selected_var1',this.setselected,this);
		this.listenTo(this.model,'change:univariate_crossover', this.render, this);
		this.listenTo(this.model,'change:ranges', this.render, this);
		this.render();
	},
	calc:function(){
		//async change to model, so render called on change:univariate_crossover
		this.model.univariateCrossover(this.output);
		return this;
	},
	setselected:function(){
		this.$el.find('input[name="selectedVar"][value="' + this.model.get('selected_var1') + '"]').prop('checked', true);
	},
    render: function() {
		console.log("render UnivariateTable "+this.output);
		var model=this.model;
		data=model.get('univariate_crossover');
		// Calculate data
		var tab=$.map(model.get('ranges'),function(e,i){
			var perc_to_limit=model.normalise(data[i],e[0]);
			var best = model.get('ranges')[i][3];
			var perc_change=null;
			if(best && data[i]) perc_change=(data[i]-best)/best*100;
			var concernClass=null;
			if(1-perc_to_limit>0.75){ concernClass="highconcern"
			} else if(1-perc_to_limit>0.25){concernClass="midconcern"
			} else { concernClass="lowconcern"}
			var row=e.concat(data[i],perc_to_limit,perc_change,concernClass);
			return _.object(["Variable","Lower","Min","Best","Max","Upper","Break","PercToLimit","PercChange","concernClass"],row);
		})
		// Call template
		this.$el.html(_.template($("#univTable_template").html(),{
			tab:tab,
			id:this.$el.prop("id")
		}));
		this.uniSliders.render();
		this.$el.find("input:radio").on('change',function(){model.set('selected_var1',this.value)});
		this.setselected();
		return this;
	}
});